import { getFeatureSignals } from './skill-audit.js'

export function getProductUrl(product, baseUrl = 'https://app.simryoko.com') {
  return `${baseUrl.replace(/\/$/, '')}/#/product/${encodeURIComponent(product.id)}`
}

export function generateProductJsonLd(product, baseUrl = 'https://app.simryoko.com') {
  const features = getFeatureSignals(product)
  const additionalProperty = [
    { '@type': 'PropertyValue', name: 'Data', value: features.data ? 'Supported' : 'Not supported' },
    { '@type': 'PropertyValue', name: 'Voice', value: features.voice ? 'Supported' : 'Not supported' },
    { '@type': 'PropertyValue', name: 'SMS', value: features.sms ? 'Supported' : 'Not supported' },
    { '@type': 'PropertyValue', name: 'Coverage', value: `${product.countries?.length || 0} countries/regions` },
  ]
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.nameEn || product.name,
    description: product.descriptionEn || product.description || product.name,
    sku: String(product.id),
    category: 'eSIM data plan',
    brand: { '@type': 'Brand', name: 'SimRyoko' },
    url: getProductUrl(product, baseUrl),
    image: product.image ? [product.image] : undefined,
    additionalProperty,
    offers: {
      '@type': 'Offer',
      priceCurrency: 'USD',
      price: String(product.price),
      availability: product.status === 'inactive' ? 'https://schema.org/OutOfStock' : 'https://schema.org/InStock',
      url: getProductUrl(product, baseUrl),
    },
  }
}

export function generateProductMeta(product) {
  const countries = (product.countries || []).slice(0, 5).map(c => c.en || c.cn || c.code).join(', ')
  const features = getFeatureSignals(product)
  const featureText = ['Data', features.voice ? 'Voice' : null, features.sms ? 'SMS' : null].filter(Boolean).join(' + ')
  return {
    title: `${product.nameEn || product.name} eSIM | ${featureText} | SimRyoko`,
    description: `${featureText} eSIM for ${countries || 'global travel'}, valid ${product.validDays || ''} days from $${product.price}. Instant activation by QR code.`,
    canonical: getProductUrl(product),
  }
}

export function buildGeoPriority(products) {
  const hot = new Set(['JP', 'TH', 'KY', 'US', 'GB', 'FR', 'DE', 'IT', 'ES', 'SG', 'MY', 'KR', 'HK', 'TW', 'ID', 'VN', 'PH', 'AU', 'CA', 'NZ'])
  const map = new Map()
  for (const product of products) {
    for (const country of product.countries || []) {
      const code = country.code || country.en || country.cn
      if (!map.has(code)) map.set(code, { code, cn: country.cn, en: country.en, products: 0, minPrice: Infinity, priority: hot.has(code) ? 100 : 0 })
      const row = map.get(code)
      row.products += 1
      row.minPrice = Math.min(row.minPrice, Number(product.price))
      row.priority += product.type === 'global' ? 1 : 2
    }
  }
  return [...map.values()].map(r => ({ ...r, minPrice: Number.isFinite(r.minPrice) ? r.minPrice : null })).sort((a, b) => b.priority - a.priority)
}
