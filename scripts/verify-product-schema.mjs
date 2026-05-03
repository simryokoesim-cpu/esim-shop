#!/usr/bin/env node
import fs from 'node:fs/promises'

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
}

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

function isVoiceOrSms(product) {
  return !!(
    product?.hasVoice ||
    product?.thirdPartyData?.voice ||
    product?.thirdPartyData?.text ||
    /\b(SMS|Min|Minute|Voice|Call)\b/i.test(String(product?.nameEn || product?.name || ''))
  )
}

function classify(product) {
  if (product.type === 'global') return 'global'
  if (product.type === 'regional') return 'regional'
  if (product.type === 'local') return 'local'
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
  if (fileArg) {
    const file = fileArg.split('=').slice(1).join('=')
    const raw = JSON.parse(await fs.readFile(file, 'utf8'))
    if (Array.isArray(raw)) return raw
    return raw.data?.list || raw.products || raw.data || []
  }

  const all = []
  for (let page = 1; page < 1000; page++) {
    const res = await fetch(`${baseUrl}/api/products?page=${page}&limit=100`)
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.success) throw new Error(`Product API failed on page ${page}: HTTP ${res.status}`)
    const list = body.data?.list || []
    const total = body.data?.total || all.length
    all.push(...list)
    if (!list.length || all.length >= total) break
  }
  return all
}

const products = await loadProducts()
const seenIds = new Set()
const countryCodes = new Set()
for (const product of products) validateProduct(product, seenIds, countryCodes)
stats.total = products.length
stats.uniqueIds = seenIds.size
stats.countries = countryCodes.size

const result = {
  ok: errors.length === 0 && (!failOnWarn || warnings.length === 0),
  source: fileArg ? fileArg.split('=').slice(1).join('=') : baseUrl,
  stats,
  errors,
  warnings,
}

console.log(JSON.stringify(result, null, 2))
if (!result.ok) process.exit(1)
