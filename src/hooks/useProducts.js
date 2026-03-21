import { useState, useEffect } from 'react'
import { fetchProducts } from '../api/esim'
import cachedProducts from '../data/products-cache.json'

// In-memory cache: { key -> { data, products, ts } }
const cache = {}
const CACHE_TTL = 10 * 60 * 1000 // 10 minutes

function cacheKey(params) {
  return JSON.stringify(params)
}

function normalizeProduct(p) {
  const isUnlimited = p.thirdPartyData?.isUnlimited || p.dataSize === 0
  return { ...p, isUnlimited }
}

// 本地缓存数据（已预处理，首屏秒开）
const localProducts = cachedProducts.map(normalizeProduct)

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
      // 无搜索条件：使用本地数据，分页
      const start = (page - 1) * limit
      const list = localProducts.slice(start, start + limit)
      setProducts(list)
      setTotal(localProducts.length)
      setLoading(false)
    }
  }, [key])

  return { products, total, loading, error }
}

// 全量产品 Hook — 直接返回本地缓存，秒开
export function useAllProducts() {
  return {
    products: localProducts,
    total: localProducts.length,
    loading: false,
    error: null,
    progress: 100,
  }
}
