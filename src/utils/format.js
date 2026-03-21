export function formatData(dataSize, isUnlimited) {
  if (isUnlimited) return '无限流量'
  if (!dataSize) return '未知'
  const gb = dataSize / 1024
  if (gb < 1) return `${dataSize}MB`
  if (gb % 1 === 0) return `${gb}GB`
  return `${gb.toFixed(1)}GB`
}

export function formatPrice(price) {
  return parseFloat(price).toFixed(2)
}

export function formatDays(days) {
  if (days >= 30) {
    const months = Math.floor(days / 30)
    return `${months}个月`
  }
  return `${days}天`
}

export function getCountryName(product) {
  if (!product.countries || product.countries.length === 0) {
    return product.type === 'global' ? '全球通用' : '未知地区'
  }
  if (product.countries.length === 1) {
    return product.countries[0].cn || product.countries[0].en
  }
  if (product.type === 'regional') {
    // Check if it's Asia
    const firstCountry = product.countries[0].cn
    if (product.name.includes('亚洲')) return '亚洲'
    if (product.name.includes('欧洲')) return '欧洲'
    if (product.name.includes('全球')) return '全球'
    return `多国 (${product.countries.length}国)`
  }
  return `${product.countries[0].cn} +${product.countries.length - 1}`
}

export function getTypeLabel(type) {
  switch (type) {
    case 'local': return '本地套餐'
    case 'regional': return '区域套餐'
    case 'global': return '全球套餐'
    default: return '套餐'
  }
}

export function generateOrderId() {
  return 'ESM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 6).toUpperCase()
}

export const USDT_ADDRESS = 'TQn9Y2khEsLJW1ChVWFMSMeRDow5KcbLSE'
