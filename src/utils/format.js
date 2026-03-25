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
  const n = product.name || ''
  const count = product.countries?.length || 0

  // 单国套餐
  if (count === 1) {
    return product.countries[0].cn || product.countries[0].en
  }

  // 多国套餐：直接从名称判断，不取 countries 数组
  if (n.includes('全球') || product.type === 'global') return '全球通用'
  if (n.includes('亚洲')) return '亚洲'
  if (n.includes('欧洲')) return '欧洲'
  if (n.includes('美洲')) return '美洲'
  if (n.includes('非洲')) return '非洲'
  if (n.includes('中东')) return '中东'
  if (n.includes('东南亚')) return '东南亚'

  // 兜底：多国就显示"多国套餐"
  if (count > 1) return `多国套餐 (${count}国)`

  return '未知地区'
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

export const USDT_ADDRESS = 'TBuhpRpFPV1HkdfaPEdxsKgTE43jV911rL'
export const TON_ADDRESS = 'UQDkn3-Q4vHmPPkjoxRBvfzLx6pahWvDCHsnO9l138casAFy'
