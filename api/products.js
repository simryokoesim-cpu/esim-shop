// Backend proxy for eSIM products API
// This keeps credentials secure on the server side

import { auditProfit, getFeatureSignals, normalizePriceForProfit } from '../scripts/skill-audit.js'
import { generateProductJsonLd, generateProductMeta } from '../scripts/skill-seo.js'

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
const VOICE_SMS_UNSUPPORTED_NOTE = '(Note: Voice/SMS features not supported by underlying metadata)'

function normalizeProduct(product) {
  const next = normalizePriceForProfit({ ...product })
  const profitAudit = auditProfit(next)
  next.profitAudit = profitAudit
  if (profitAudit.status === 'FINANCIAL_LOSS') {
    next.status = 'inactive'
    next.inactiveReason = 'DATA_ERROR'
  }
  const signals = getFeatureSignals(next)
  next.hasVoice = signals.voice
  next.capability = signals
  const features = Array.isArray(next.features) ? [...next.features] : []
  if (signals.voice && !features.some(f => /语音|通话|Voice|Call/i.test(String(f)))) features.unshift('包含语音通话')
  if (signals.sms && !features.some(f => /短信|SMS|Text/i.test(String(f)))) features.unshift('包含短信服务')
  next.features = features.filter(feature => !/Voice\/SMS features not supported/i.test(String(feature)))
  next.description = String(next.description || '').replace(VOICE_SMS_UNSUPPORTED_NOTE, '').replace(/，\s*$/,'').trim()
  next.descriptionEn = String(next.descriptionEn || '').replace(VOICE_SMS_UNSUPPORTED_NOTE, '').trim()
  next.seo = generateProductMeta(next)
  next.jsonLd = generateProductJsonLd(next)
  return next
}

function normalizeProducts(products, { filterFinancialLoss = true } = {}) {
  const normalized = (products || []).map(normalizeProduct)
  return filterFinancialLoss ? normalized.filter(product => product.profitAudit?.status !== 'FINANCIAL_LOSS') : normalized
}

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

async function fetchAllRawProducts(token) {
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

  return allProducts
}

async function fetchAllProducts(token) {
  if (cachedProducts && Date.now() < productsCacheExpiry) {
    return cachedProducts
  }

  const allProducts = await fetchAllRawProducts(token)

  cachedProducts = normalizeProducts(allProducts, { filterFinancialLoss: true })
  productsCacheExpiry = Date.now() + PRODUCTS_CACHE_TTL
  return cachedProducts
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
    const { page = 1, limit = 20, search = '', keyword = '', country = '', id = '', includeFinancialLoss = '' } = req.query
    const keywordValue = search || keyword
    const allowFinancialAudit = includeFinancialLoss === '1' && req.headers['x-profit-audit-secret'] && process.env.PROFIT_AUDIT_SECRET && req.headers['x-profit-audit-secret'] === process.env.PROFIT_AUDIT_SECRET

    if (id || keywordValue || country) {
      let products = allowFinancialAudit
        ? normalizeProducts(await fetchAllRawProducts(token), { filterFinancialLoss: false })
        : await fetchAllProducts(token)
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
        const countryCode = String(country).toUpperCase()
        products = products.filter(product => (product.countries || []).some(c => String(c.code || '').toUpperCase() === countryCode))
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

    const products = allowFinancialAudit
      ? normalizeProducts(await fetchAllRawProducts(token), { filterFinancialLoss: false })
      : await fetchAllProducts(token)
    return res.status(200).json({
      success: true,
      data: {
        list: paginate(products, page, limit),
        total: products.length,
        page: parseInt(page, 10) || 1,
        limit: parseInt(limit, 10) || 20,
      },
    })
    
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
}
