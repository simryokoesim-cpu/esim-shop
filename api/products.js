// Backend proxy for eSIM products API
// This keeps credentials secure on the server side

const API_BASE = 'https://ciuh32wky.xigrocoltd.com/api'
function getCredentials() {
  const username = process.env.ESIM_API_USERNAME
  const password = process.env.ESIM_API_PASSWORD
  if (!username || !password) {
    throw new Error('Missing ESIM_API_USERNAME or ESIM_API_PASSWORD')
  }
  return { username, password }
}

let cachedToken = null
let tokenExpiry = 0
let cachedProducts = null
let productsCacheExpiry = 0
const PRODUCTS_CACHE_TTL = 10 * 60 * 1000

async function login() {
  const res = await fetch(`${API_BASE}/agent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(getCredentials()),
  })
  const data = await res.json()
  if (!data.success) throw new Error('Login failed: ' + data.message)
  
  cachedToken = data.data.token
  tokenExpiry = Date.now() + 23 * 60 * 60 * 1000 // 23 hours
  return cachedToken
}

async function getToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken
  }
  return await login()
}

async function fetchSupplierProducts(token, params) {
  const apiRes = await fetch(`${API_BASE}/agent/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (apiRes.status === 401) {
    cachedToken = null
    const newToken = await login()
    const retryRes = await fetch(`${API_BASE}/agent/products?${params}`, {
      headers: { Authorization: `Bearer ${newToken}` },
    })
    return retryRes.json()
  }

  return apiRes.json()
}

async function fetchAllProducts(token) {
  if (cachedProducts && Date.now() < productsCacheExpiry) {
    return cachedProducts
  }

  const allProducts = []
  let page = 1
  while (true) {
    const data = await fetchSupplierProducts(token, new URLSearchParams({ page, limit: 100 }))
    const list = data.data?.list || []
    if (!list.length) break
    allProducts.push(...list)
    const total = data.data?.total || allProducts.length
    if (allProducts.length >= total) break
    page += 1
  }

  cachedProducts = allProducts
  productsCacheExpiry = Date.now() + PRODUCTS_CACHE_TTL
  return allProducts
}

function getKeywordScore(product, keyword) {
  const needle = String(keyword || '').trim().toLowerCase()
  if (!needle) return 0

  const name = String(product.name || '').toLowerCase()
  const nameEn = String(product.nameEn || '').toLowerCase()
  const countries = product.countries || []
  const countryMatch = countries.some(c => [c.cn, c.en, c.code].some(value => String(value || '').toLowerCase().includes(needle)))

  if (name === needle || nameEn === needle) return 100
  if (name.startsWith(needle) || nameEn.startsWith(needle)) return 90
  if (countryMatch && countries.length === 1) return 80
  if (name.includes(needle) || nameEn.includes(needle)) return 70
  if (countryMatch && product.type !== 'global') return 60
  if (countryMatch) return 40
  if (String(product.description || '').toLowerCase().includes(needle)) return 20
  if (String(product.type || '').toLowerCase().includes(needle)) return 10
  return 0
}

function paginate(list, page, limit) {
  const safePage = Math.max(parseInt(page, 10) || 1, 1)
  const safeLimit = Math.max(parseInt(limit, 10) || 20, 1)
  const start = (safePage - 1) * safeLimit
  return list.slice(start, start + safeLimit)
}

export default async function handler(req, res) {
  // Enable CORS
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type')
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end()
  }
  
  try {
    const token = await getToken()
    
    // Forward query params
    const { page = 1, limit = 20, search = '', keyword = '', country = '', id = '' } = req.query
    const keywordValue = search || keyword

    if (id || keywordValue) {
      let products = await fetchAllProducts(token)
      if (id) {
        products = products.filter(product => String(product.id) === String(id))
      }
      if (keywordValue) {
        products = products
          .map(product => ({ product, score: getKeywordScore(product, keywordValue) }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score || Number(a.product.price || 0) - Number(b.product.price || 0))
          .map(item => item.product)
      }
      if (country) {
        products = products.filter(product => (product.countries || []).some(c => c.code === country))
      }
      return res.status(200).json({
        success: true,
        data: {
          list: paginate(products, page, limit),
          total: products.length,
          page: parseInt(page, 10) || 1,
          limit: parseInt(limit, 10) || 20,
        },
      })
    }

    const params = new URLSearchParams({ page, limit })
    if (country) params.set('country', country)
    const data = await fetchSupplierProducts(token, params)
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
}
