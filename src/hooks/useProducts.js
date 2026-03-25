import { useState, useEffect } from 'react'
import { fetchProducts } from '../api/esim'

// In-memory cache: { key -> { data, products, ts } }
const cache = {}
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

const SUPABASE_URL = 'https://afdyzuohzwdvreyhnfdb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_FfMQeSJTbZPfsKtMF6nyqA_Fgo_gzun'
const LS_CACHE_KEY = 'esim_products_cache_v5'
const LS_CACHE_TTL = 60 * 60 * 1000 // 1 hour

// 清理所有旧版本缓存
;['v1','v2','v3','v4'].forEach(v => {
  try { localStorage.removeItem(`esim_products_cache_${v}`) } catch(e) {}
})

function cacheKey(params) {
  return JSON.stringify(params)
}

function normalizeProduct(p) {
  // 兼容 Supabase 字段名（snake_case）和供应商API字段名（camelCase）
  const normalized = {
    ...p,
    // 字段名映射
    dataSize: p.dataSize ?? p.data_size ?? 0,
    validDays: p.validDays ?? p.valid_days ?? 0,
    countries: p.countries ?? (p.country ? [{ code: p.country, name: p.country }] : []),
    price: p.price ?? p.retailPrice ?? 0,
    name: p.name ?? '',
  }
  const isUnlimited = p.thirdPartyData?.isUnlimited || normalized.dataSize === 0
  return { ...normalized, isUnlimited }
}

// 从 Supabase 分页拉取所有产品
async function fetchAllFromSupabase() {
  // 使用供应商API拉取完整产品数据（含正确的countries数组格式）
  const { fetchProducts: fetchFromApi } = await import('./useProducts').catch(() => ({}))
  
  // 直接调用供应商API
  const API_BASE = 'https://ciuh32wky.xigrocoltd.com/api'
  const CREDENTIALS = { username: 'tgesim', password: '123123' }
  
  // 登录获取token
  const loginRes = await fetch(`${API_BASE}/agent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS),
  })
  const loginData = await loginRes.json()
  if (!loginData.success) throw new Error('Login failed')
  const token = loginData.data.token

  // 分页拉取所有产品
  const allProducts = []
  let page = 1
  while (true) {
    const res = await fetch(`${API_BASE}/agent/products?page=${page}&limit=100`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    if (!res.ok) break
    const data = await res.json()
    const list = data.data?.list || []
    if (!list.length) break
    allProducts.push(...list)
    const total = data.data?.total || 0
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
    // 1. 先检查 localStorage 缓存
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

    // 2. 从 Supabase 拉取
    try {
      console.log('[Products] Fetching from Supabase...')
      const raw = await fetchAllFromSupabase()
      console.log(`[Products] Fetched ${raw.length} from Supabase`)
      const products = raw.map(normalizeProduct)

      // 缓存到 localStorage
      try {
        localStorage.setItem(LS_CACHE_KEY, JSON.stringify({ ts: Date.now(), data: raw }))
      } catch (e) {
        console.warn('[Products] localStorage write failed:', e)
      }

      allProductsCache = products
      return products
    } catch (e) {
      console.error('[Products] Supabase fetch failed, falling back to local cache:', e)
    }

    // 3. 兜底：本地缓存
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
