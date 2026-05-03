export const LOW_MARGIN_THRESHOLD_USD = 0.3
export const DYNAMIC_PRICE_MARKUP = 0.2
export const DYNAMIC_PRICE_FEE_USD = 1

export function parseUsd(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function getWholesaleCost(product) {
  return parseUsd(product?.agentPrice ?? product?.cost_price ?? product?.costPrice ?? product?.wholesaleCost ?? product?.wholesale_price ?? product?.wholesalePrice)
}

export function getRetailPrice(product) {
  return parseUsd(product?.price ?? product?.retailPrice)
}

export function getCommercialText(product) {
  return [product?.name, product?.nameEn, product?.description, product?.descriptionEn, ...(Array.isArray(product?.features) ? product.features : [])]
    .filter(Boolean)
    .join(' ')
}

export function getFeatureSignals(product) {
  const text = getCommercialText(product)
  const voice = !!(product?.hasVoice || product?.thirdPartyData?.voice || /\b(Min|Minute|Minutes|Voice|Call|Calls)\b|语音|通话/i.test(text))
  const sms = !!(product?.thirdPartyData?.text || /\b(SMS|Text|Texts)\b|短信/i.test(text))
  const data = true
  return { data, voice, sms, source: voice || sms ? 'copy-first-feature-defense' : 'thirdPartyData' }
}

export function hasAdvantageFeatures(product) {
  const f = getFeatureSignals(product)
  return !!(f.voice || f.sms)
}

export function dynamicRetailPriceFromCost(cost) {
  const n = parseUsd(cost)
  if (n === null) return null
  return Number(Math.ceil((n * (1 + DYNAMIC_PRICE_MARKUP) + DYNAMIC_PRICE_FEE_USD) * 100) / 100).toFixed(2)
}

export function normalizePriceForProfit(product) {
  const next = { ...product }
  const cost = getWholesaleCost(next)
  const price = getRetailPrice(next)
  const margin = price === null || cost === null ? null : Number((price - cost).toFixed(2))
  if (hasAdvantageFeatures(next) && cost !== null && (margin === null || margin <= 0)) {
    const dynamicPrice = dynamicRetailPriceFromCost(cost)
    next.originalPrice = next.price
    next.price = dynamicPrice
    next.dynamicPricing = {
      applied: true,
      reason: 'ADVANTAGE_FEATURE_MARGIN_RECOVERY',
      formula: 'ceil((Wholesale_Cost * 1.20 + 1.00) * 100) / 100',
      originalPriceUsd: price,
      wholesaleCostUsd: cost,
      adjustedPriceUsd: Number(dynamicPrice),
    }
  }
  return next
}

export function auditProfit(product) {
  const normalized = normalizePriceForProfit(product)
  const retailPriceUsd = getRetailPrice(normalized)
  const wholesaleCostUsd = getWholesaleCost(normalized)
  const marginUsd = retailPriceUsd === null || wholesaleCostUsd === null ? null : Number((retailPriceUsd - wholesaleCostUsd).toFixed(2))
  const status = marginUsd === null
    ? 'MISSING_COST'
    : marginUsd <= 0
      ? 'FINANCIAL_LOSS'
      : marginUsd < LOW_MARGIN_THRESHOLD_USD
        ? 'LOW_MARGIN'
        : 'PROFITABLE'
  return {
    status,
    currency: 'USD',
    retailPriceUsd,
    wholesaleCostUsd,
    marginUsd,
    source: normalized.dynamicPricing?.applied ? 'dynamic-price-cost-plus' : 'price-agentPrice',
    dynamicPricing: normalized.dynamicPricing || { applied: false },
  }
}

export function isFinancialLoss(product) {
  return auditProfit(product).status === 'FINANCIAL_LOSS'
}

export function getCountryLabel(product) {
  return product?.countries?.[0]?.cn || product?.countries?.[0]?.en || product?.country || product?.type || 'Unknown'
}

export function summarizeProfit(products) {
  const audited = products.map(product => ({ product, audit: auditProfit(product) }))
  const financialLoss = audited.filter(item => item.audit.status === 'FINANCIAL_LOSS')
  const lowMargin = audited.filter(item => item.audit.status === 'LOW_MARGIN')
  const missingCost = audited.filter(item => item.audit.status === 'MISSING_COST')
  const profitable = audited.filter(item => item.audit.status === 'PROFITABLE' || item.audit.status === 'LOW_MARGIN')
  const dynamicPriced = audited.filter(item => item.audit.dynamicPricing?.applied)

  const toReportRow = ({ product, audit }) => ({
    id: product.id,
    country: getCountryLabel(product),
    name: product.name || product.nameEn,
    nameEn: product.nameEn,
    priceUsd: audit.retailPriceUsd,
    wholesaleCostUsd: audit.wholesaleCostUsd,
    marginUsd: audit.marginUsd,
    status: audit.status,
    dynamicPricing: audit.dynamicPricing,
  })

  return {
    currency: 'USD',
    total: products.length,
    profitableCount: profitable.length,
    financialLossCount: financialLoss.length,
    lowMarginCount: lowMargin.length,
    missingCostCount: missingCost.length,
    dynamicPricedCount: dynamicPriced.length,
    dynamicPriced: dynamicPriced.map(toReportRow).sort((a, b) => a.id - b.id),
    topLossBlacklist: financialLoss.map(toReportRow).sort((a, b) => a.marginUsd - b.marginUsd).slice(0, 10),
    financialLoss: financialLoss.map(toReportRow).sort((a, b) => a.marginUsd - b.marginUsd),
    lowMargin: lowMargin.map(toReportRow).sort((a, b) => a.marginUsd - b.marginUsd),
    missingCost: missingCost.map(toReportRow),
  }
}
