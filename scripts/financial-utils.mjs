export const LOW_MARGIN_THRESHOLD_USD = 0.3

export function parseUsd(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

export function getWholesaleCost(product) {
  return parseUsd(
    product?.agentPrice ??
    product?.cost_price ??
    product?.costPrice ??
    product?.wholesaleCost ??
    product?.wholesale_price ??
    product?.wholesalePrice
  )
}

export function getRetailPrice(product) {
  return parseUsd(product?.price ?? product?.retailPrice)
}

export function getCountryLabel(product) {
  return product?.countries?.[0]?.cn || product?.countries?.[0]?.en || product?.country || product?.type || 'Unknown'
}

export function auditProfit(product) {
  const retailPriceUsd = getRetailPrice(product)
  const wholesaleCostUsd = getWholesaleCost(product)
  const marginUsd = retailPriceUsd === null || wholesaleCostUsd === null
    ? null
    : Number((retailPriceUsd - wholesaleCostUsd).toFixed(2))
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
    source: 'price-agentPrice',
  }
}

export function isFinancialLoss(product) {
  return auditProfit(product).status === 'FINANCIAL_LOSS'
}

export function summarizeProfit(products) {
  const audited = products.map(product => ({ product, audit: auditProfit(product) }))
  const financialLoss = audited.filter(item => item.audit.status === 'FINANCIAL_LOSS')
  const lowMargin = audited.filter(item => item.audit.status === 'LOW_MARGIN')
  const missingCost = audited.filter(item => item.audit.status === 'MISSING_COST')
  const profitable = audited.filter(item => item.audit.status === 'PROFITABLE' || item.audit.status === 'LOW_MARGIN')

  const toReportRow = ({ product, audit }) => ({
    id: product.id,
    country: getCountryLabel(product),
    name: product.name || product.nameEn,
    nameEn: product.nameEn,
    priceUsd: audit.retailPriceUsd,
    wholesaleCostUsd: audit.wholesaleCostUsd,
    marginUsd: audit.marginUsd,
    status: audit.status,
  })

  return {
    currency: 'USD',
    total: products.length,
    profitableCount: profitable.length,
    financialLossCount: financialLoss.length,
    lowMarginCount: lowMargin.length,
    missingCostCount: missingCost.length,
    topLossBlacklist: financialLoss
      .map(toReportRow)
      .sort((a, b) => a.marginUsd - b.marginUsd)
      .slice(0, 10),
    financialLoss: financialLoss.map(toReportRow).sort((a, b) => a.marginUsd - b.marginUsd),
    lowMargin: lowMargin.map(toReportRow).sort((a, b) => a.marginUsd - b.marginUsd),
    missingCost: missingCost.map(toReportRow),
  }
}
