#!/usr/bin/env node
import { auditProfit, getFeatureSignals, normalizePriceForProfit, summarizeProfit } from './skill-audit.js'
import { loadProductsSource } from './load-products-source.mjs'

const args = new Set(process.argv.slice(2))
const urlArg = process.argv.find(arg => arg.startsWith('--url='))
const fileArg = process.argv.find(arg => arg.startsWith('--file='))
const baseUrl = (urlArg?.split('=').slice(1).join('=') || 'https://app.simryoko.com').replace(/\/$/, '')
const failOnWarn = args.has('--fail-on-warn')

const errors = []
const warnings = []
const stats = {
  total: 0,
  uniqueIds: 0,
  countries: 0,
  local: 0,
  regional: 0,
  global: 0,
  dataOnly: 0,
  voiceOrSms: 0,
  thirdPartyDataPresent: 0,
  thirdPartyDataMissing: 0,
  featureDefenseRestored: 0,
  financialLossBlocked: 0,
  lowMarginWarnings: 0,
  profitableOnline: 0,
}
const VOICE_SMS_UNSUPPORTED_NOTE = '(Note: Voice/SMS features not supported by underlying metadata)'

function addError(product, code, message, extra = {}) {
  errors.push({ id: product?.id ?? null, code, message, ...extra })
}

function addWarning(product, code, message, extra = {}) {
  warnings.push({ id: product?.id ?? null, code, message, ...extra })
}

function isUnlimited(product) {
  return !!(
    product?.isUnlimited ||
    product?.thirdPartyData?.isUnlimited ||
    /无限|unlimited/i.test(String(product?.nameEn || product?.name || ''))
  )
}

function getFeatureText(product) {
  return [
    product?.name,
    product?.nameEn,
    product?.description,
    product?.descriptionEn,
    ...(Array.isArray(product?.features) ? product.features : []),
  ].filter(Boolean).join(' ').replaceAll(VOICE_SMS_UNSUPPORTED_NOTE, '')
}

function hasVoiceOrSmsText(product) {
  return /\b(SMS|Min|Minute|Minutes|Voice|Call|Calls|Text|Texts)\b|语音|短信|通话/i.test(getFeatureText(product))
}

function isVoiceOrSms(product) {
  return !!(
    product?.hasVoice ||
    product?.thirdPartyData?.voice ||
    product?.thirdPartyData?.text ||
    hasVoiceOrSmsText(product)
  )
}

function normalizeProduct(product) {
  const next = normalizePriceForProfit({ ...product })
  const profitAudit = auditProfit(product)
  next.profitAudit = profitAudit
  if (profitAudit.status === 'FINANCIAL_LOSS') {
    next.status = 'inactive'
    next.inactiveReason = 'FINANCIAL_LOSS'
  }
  const signals = getFeatureSignals(next)
  if ((signals.voice || signals.sms) && (!product?.hasVoice && !product?.thirdPartyData?.voice && !product?.thirdPartyData?.text)) stats.featureDefenseRestored += 1
  next.hasVoice = signals.voice
  next.capability = signals
  const features = Array.isArray(next.features) ? [...next.features] : []
  if (signals.voice && !features.some(f => /语音|通话|Voice|Call/i.test(String(f)))) features.unshift('包含语音通话')
  if (signals.sms && !features.some(f => /短信|SMS|Text/i.test(String(f)))) features.unshift('包含短信服务')
  next.features = features.filter(feature => !/Voice\/SMS features not supported/i.test(String(feature)))
  next.description = String(next.description || '').replace(VOICE_SMS_UNSUPPORTED_NOTE, '').replace(/，\s*$/,'').trim()
  next.descriptionEn = String(next.descriptionEn || '').replace(VOICE_SMS_UNSUPPORTED_NOTE, '').trim()
  return next
}

function classify(product) {
  if (product.type === 'global') return 'global'
  const count = product.countries?.length || 0
  if (count === 1) return 'local'
  if (count > 1) return 'regional'
  return 'unknown'
}

function validateProduct(product, seenIds, countryCodes) {
  if (!product || typeof product !== 'object') return addError(product, 'BAD_PRODUCT', 'Product is not an object')
  const id = String(product.id ?? '')
  if (!id) addError(product, 'MISSING_ID', 'Product missing id')
  if (seenIds.has(id)) addError(product, 'DUPLICATE_ID', 'Duplicate product id')
  seenIds.add(id)

  if (!product.name && !product.nameEn) addError(product, 'MISSING_NAME', 'Product missing name/nameEn')
  const thirdPartyData = product.thirdPartyData
  if (!thirdPartyData || typeof thirdPartyData !== 'object') {
    stats.thirdPartyDataMissing += 1
    addError(product, 'MISSING_THIRD_PARTY_DATA', 'Product missing thirdPartyData for supplier feature validation')
  } else {
    stats.thirdPartyDataPresent += 1
    if (!thirdPartyData.packageId && !thirdPartyData.packageSlug) {
      addWarning(product, 'WEAK_THIRD_PARTY_IDENTITY', 'thirdPartyData missing packageId/packageSlug')
    }
  }

  const price = Number(product.price)
  if (!Number.isFinite(price) || price <= 0) addError(product, 'BAD_PRICE', 'Product price must be positive', { price: product.price })

  const countries = product.countries
  if (!Array.isArray(countries) || countries.length === 0) {
    addError(product, 'MISSING_COUNTRIES', 'Product must have non-empty countries[]')
  } else {
    for (const c of countries) {
      const code = String(c?.code || '').trim().toUpperCase()
      if (!code) addError(product, 'MISSING_COUNTRY_CODE', 'Country entry missing code', { country: c })
      else countryCodes.add(code)
    }
  }

  const cls = classify(product)
  if (cls === 'unknown') addError(product, 'BAD_TYPE', 'Cannot classify product', { type: product.type })
  if (cls === 'local' && countries?.length !== 1) addError(product, 'LOCAL_COUNTRY_MISMATCH', 'Local product must cover exactly one country', { type: product.type, countries: countries?.length })
  if (cls === 'regional' && (countries?.length || 0) < 2) addError(product, 'REGIONAL_COUNTRY_MISMATCH', 'Regional product must cover at least two countries', { type: product.type, countries: countries?.length })
  if (cls === 'global' && product.type !== 'global') addError(product, 'GLOBAL_TYPE_MISMATCH', 'Global classification requires type=global', { type: product.type })

  if (!isUnlimited(product) && !isVoiceOrSms(product) && (!Number.isFinite(Number(product.dataSize)) || Number(product.dataSize) <= 0)) {
    addWarning(product, 'MISSING_DATA_SIZE', 'Pure data product has no positive dataSize and is not unlimited', { dataSize: product.dataSize })
  }
  if (!Number.isFinite(Number(product.validDays)) || Number(product.validDays) <= 0) {
    addWarning(product, 'BAD_VALID_DAYS', 'Product validDays should be positive', { validDays: product.validDays })
  }

  stats[cls] = (stats[cls] || 0) + 1
  if (isVoiceOrSms(product)) stats.voiceOrSms += 1
  else stats.dataOnly += 1
}

async function loadProducts() {
  const file = fileArg?.split('=').slice(1).join('=')
  return loadProductsSource({ baseUrl, fileArg: file, includeFinancialLoss: true })
}

const loaded = await loadProducts()
const rawProducts = loaded.products
const normalizedProducts = rawProducts.map(normalizeProduct)
const financial = summarizeProfit(normalizedProducts)
const products = normalizedProducts.filter(product => product.profitAudit?.status !== 'FINANCIAL_LOSS')
stats.financialLossBlocked = financial.financialLossCount
stats.lowMarginWarnings = financial.lowMarginCount
stats.profitableOnline = products.length
const seenIds = new Set()
const countryCodes = new Set()
for (const product of products) validateProduct(product, seenIds, countryCodes)
stats.total = rawProducts.length
stats.uniqueIds = seenIds.size
stats.countries = countryCodes.size

const result = {
  ok: errors.length === 0 && (!failOnWarn || warnings.length === 0),
  source: loaded.source,
  stats,
  financial: {
    currency: financial.currency,
    source: 'price(agent retail USD) - agentPrice(wholesale USD); no FX conversion applied because supplier returns both fields in USD',
    onlineProfitableProducts: products.length,
    financialLossBlocked: financial.financialLossCount,
    lowMarginWarnings: financial.lowMarginCount,
    missingCostCount: financial.missingCostCount,
    top10LossBlacklist: financial.topLossBlacklist,
    lowMargin: financial.lowMargin,
  },
  errors,
  warnings,
}

console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exit(1)
