import { useState, useEffect } from 'react'
import { fetchProducts } from '../api/esim'

// In-memory cache: { key -> { data, products, ts } }
const cache = {}
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

const LS_CACHE_KEY = 'esim_products_cache_v8'
const LS_CACHE_TTL = 60 * 60 * 1000 // 1 hour
const VOICE_SMS_UNSUPPORTED_NOTE = '(Note: Voice/SMS features not supported by underlying metadata)'

// 清理所有旧版本缓存
;['v1','v2','v3','v4','v5','v6','v7'].forEach(v => {
  try { localStorage.removeItem(`esim_products_cache_${v}`) } catch(e) {}
})

function cacheKey(params) {
  return JSON.stringify(params)
}

function normalizeProduct(p) {
  const dataSize = p.dataSize ?? p.data_size ?? 0
  const validDays = p.validDays ?? p.valid_days ?? 0
  const countries = p.countries ?? (p.country ? [{ code: p.country, cn: p.country, en: p.country }] : [])
  const price = p.price ?? p.retailPrice ?? 0
  const isUnlimited = p.isUnlimited ?? p.thirdPartyData?.isUnlimited ?? (dataSize === 0)
  const featureText = [p.name, p.nameEn, p.description, p.descriptionEn, ...(Array.isArray(p.features) ? p.features : [])]
    .filter(Boolean).join(' ').replaceAll(VOICE_SMS_UNSUPPORTED_NOTE, '')
  const textSuggestsVoiceOrSms = /\b(SMS|Min|Minute|Minutes|Voice|Call|Calls|Text|Texts)\b|语音|短信|通话/i.test(featureText)
  const metadataConfirmsVoiceOrSms = !!(p.hasVoice || p.thirdPartyData?.voice || p.thirdPartyData?.text)
  const forceDataOnly = textSuggestsVoiceOrSms && !metadataConfirmsVoiceOrSms
  const hasVoice = forceDataOnly ? false : !!(p.hasVoice || p.thirdPartyData?.voice)
  const features = forceDataOnly
    ? (Array.isArray(p.features) ? p.features : []).filter(feature => !/语音|短信|通话|\b(SMS|Voice|Calls?|Texts?|Minutes?)\b/i.test(String(feature || '')))
    : p.features
  const normalizedFeatures = forceDataOnly && !features.some(feature => /仅数据|data only/i.test(String(feature)))
    ? ['仅数据流量', ...features]
    : features
  const description = forceDataOnly && !String(p.description || '').includes(VOICE_SMS_UNSUPPORTED_NOTE)
    ? `${String(p.description || '').replace(/。?包含语音通话/g, '').replace(/，?包含语音通话/g, '').replace(/。?包含短信服务/g, '').replace(/，?包含短信服务/g, '').trim()} ${VOICE_SMS_UNSUPPORTED_NOTE}`.trim()
    : p.description
  return { ...p, dataSize, validDays, countries, price, isUnlimited, hasVoice, features: normalizedFeatures, description, name: p.name ?? '', capability: p.capability || { data: true, voice: hasVoice, sms: !!p.thirdPartyData?.text, source: 'thirdPartyData' } }
}

// 从后端代理分页拉取所有产品（禁止在前端直连供应商 API 或携带凭证）
async function fetchAllProductsFromProxy() {
  const allProducts = []
  let page = 1

  while (true) {
    const data = await fetchProducts({ page, limit: 100 })
    const list = Array.isArray(data.data)
      ? data.data
      : (data.data?.list || [])

    if (!list.length) break
    allProducts.push(...list)

    const total = data.data?.total || data.pagination?.total || allProducts.length
    if (allProducts.length >= total) break
    page++
  }

  return allProducts
}

// 本地缓存数据（动态加载，作为兜底）
let localProducts = []
let localLoaded = false

async function loadLocalProducts() {
  if (localLoaded) return localProducts
  try {
    const mod = await import('../data/products-cache.json')
    localProducts = (mod.default || []).map(normalizeProduct)
    localLoaded = true
  } catch (e) {
    console.error('Failed to load local products:', e)
    localProducts = []
    localLoaded = true
  }
  return localProducts
}

// 全量产品（带 localStorage 缓存）
let allProductsCache = null
let allProductsLoading = null

async function getAllProducts() {
  // 已在内存中
  if (allProductsCache) return allProductsCache

  // 正在加载中，等待
  if (allProductsLoading) return allProductsLoading

  allProductsLoading = (async () => {
    // 1. 先从后端代理获取规范化产品。产品能力/描述以服务端 schema gate 为准。
    try {
      console.log('[Products] Fetching normalized products from API...')
      const raw = await fetchAllProductsFromProxy()
      console.log(`[Products] Fetched ${raw.length} from API`)
      const products = raw.map(normalizeProduct)
      try {
        localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: raw }))
      } catch (e) {}
      allProductsCache = products
      return products
    } catch (e) {
      console.warn('[Products] API fetch failed:', e)
    }

    // 2. 检查 localStorage 缓存
    try {
      const raw = localStorage.getItem(LS_CACHE_KEY)
      if (raw) {
        const { ts, data } = JSON.parse(raw)
        if (Date.now() - ts < LS_CACHE_TTL && Array.isArray(data) && data.length > 0) {
          console.log(`[Products] Loaded ${data.length} from localStorage cache`)
          allProductsCache = data.map(normalizeProduct)
          return allProductsCache
        }
      }
    } catch (e) {
      console.warn('[Products] localStorage read failed:', e)
    }

    // 3. 兜底：本地打包缓存（只在 API/localStorage 都不可用时使用）
    const fallback = await loadLocalProducts()
    allProductsCache = fallback
    return fallback
  })()

  try {
    const result = await allProductsLoading
    return result
  } finally {
    allProductsLoading = null
  }
}

export function useProducts({ page = 1, limit = 50, search = '', country = '' } = {}) {
  const key = cacheKey({ page, limit, search, country })
  const hit = cache[key]

  const [products, setProducts] = useState(hit ? hit.products : [])
  const [total, setTotal] = useState(hit ? hit.total : 0)
  const [loading, setLoading] = useState(!hit)
  const [error, setError] = useState(null)

  useEffect(() => {
    const hit = cache[key]
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      setProducts(hit.products)
      setTotal(hit.total)
      setLoading(false)
      return
    }

    // 有搜索条件时才调用 API
    if (search || country) {
      setLoading(true)
      fetchProducts({ page, limit, search, country })
        .then(data => {
          let list, tot
          if (Array.isArray(data.data)) {
            list = data.data
            tot = data.pagination?.total || list.length
          } else if (data.data?.list) {
            list = data.data.list
            tot = data.data.total || list.length
          } else {
            list = []
            tot = 0
          }
          list = list.map(normalizeProduct)
          cache[key] = { products: list, total: tot, ts: Date.now() }
          setProducts(list)
          setTotal(tot)
          setLoading(false)
        })
        .catch(err => {
          setError(err.message)
          setLoading(false)
        })
    } else {
      // 无搜索条件：使用全量数据，分页
      getAllProducts().then(allProds => {
        const start = (page - 1) * limit
        const list = allProds.slice(start, start + limit)
        setProducts(list)
        setTotal(allProds.length)
        setLoading(false)
      }).catch(() => {
        setLoading(false)
      })
    }
  }, [key])

  return { products, total, loading, error }
}

// 全量产品 Hook — 从 Supabase 拉取（带 localStorage 缓存，兜底本地文件）
export function useAllProducts() {
  const [products, setProducts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 超时保护：8秒后强制结束 loading
    const timeout = setTimeout(() => {
      setLoading(false)
    }, 8000)

    getAllProducts().then(list => {
      clearTimeout(timeout)
      setProducts(list)
      setLoading(false)
    }).catch(() => {
      clearTimeout(timeout)
      loadLocalProducts().then(list => {
        setProducts(list)
        setLoading(false)
      })
    })

    return () => clearTimeout(timeout)
  }, [])

  return {
    products,
    total: products.length,
    loading,
    error: null,
    progress: loading ? 50 : 100,
  }
}
