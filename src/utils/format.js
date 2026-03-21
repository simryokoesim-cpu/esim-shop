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

// 热门国家优先级
const PRIORITY_COUNTRIES = ['CN','TH','JP','SG','MY','KR','HK','TW','ID','VN','PH','MO','LK','IN','AE','GB','FR','DE','IT','ES','US','AU']

export function getCountryName(product) {
  if (!product.countries || product.countries.length === 0) {
    return product.type === 'global' ? '全球通用' : '未知地区'
  }
  if (product.countries.length === 1) {
    return product.countries[0].cn || product.countries[0].en
  }
  // 多国套餐：按产品名判断
  if (product.name.includes('亚洲')) return '亚洲'
  if (product.name.includes('欧洲')) return '欧洲'
  if (product.name.includes('全球') || product.type === 'global') return '全球通用'
  if (product.name.includes('区域')) return '区域套餐'
  // 找出最热门的那个国家显示
  const sorted = [...product.countries].sort((a, b) => {
    const ai = PRIORITY_COUNTRIES.indexOf(a.code)
    const bi = PRIORITY_COUNTRIES.indexOf(b.code)
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi)
  })
  const best = sorted[0]
  if (product.countries.length > 5) {
    return `${best.cn || best.en} 等${product.countries.length}国`
  }
  return `${best.cn || best.en} +${product.countries.length - 1}`
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
