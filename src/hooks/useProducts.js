import { useState, useEffect, useCallback } from 'react'
import { fetchProducts } from '../api/esim'

// In-memory cache: { key -> { data, products, ts } }
const cache = {}
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

function cacheKey(params) {
  return JSON.stringify(params)
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

    setLoading(true)
    setError(null)

    fetchProducts({ page, limit, search, country })
      .then(data => {
        let list, tot
        if (data.success === false) {
          throw new Error(data.message || 'API error')
        }
        // Response shape: { data: [...], pagination: { total } }
        // or { data: { list, total } }
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

        // Normalize products
        list = list.map(normalizeProduct)
        cache[key] = { products: list, total: tot, ts: Date.now() }
        setProducts(list)
        setTotal(tot)
        setLoading(false)
      })
      .catch(err => {
        console.error('Failed to load products:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [key])

  return { products, total, loading, error }
}

// Hook to load all pages (for full product list)
export function useAllProducts() {
  const ALL_KEY = 'all_products'
  const hit = cache[ALL_KEY]

  const [products, setProducts] = useState(hit ? hit.products : [])
  const [total, setTotal] = useState(hit ? hit.total : 0)
  const [loading, setLoading] = useState(!hit)
  const [error, setError] = useState(null)
  const [progress, setProgress] = useState(hit ? 100 : 0)

  useEffect(() => {
    const hit = cache[ALL_KEY]
    if (hit && Date.now() - hit.ts < CACHE_TTL) {
      setProducts(hit.products)
      setTotal(hit.total)
      setLoading(false)
      setProgress(100)
      return
    }

    setLoading(true)
    setError(null)

    // First load first page to get total
    const PAGE_SIZE = 100
    fetchProducts({ page: 1, limit: PAGE_SIZE })
      .then(async (data) => {
        let firstBatch, tot

        if (Array.isArray(data.data)) {
          firstBatch = data.data.map(normalizeProduct)
          tot = data.pagination?.total || firstBatch.length
        } else if (data.data?.list) {
          firstBatch = data.data.list.map(normalizeProduct)
          tot = data.data.total || firstBatch.length
        } else {
          firstBatch = []
          tot = 0
        }

        setTotal(tot)
        setProgress(Math.round((firstBatch.length / tot) * 100))

        if (firstBatch.length >= tot) {
          // Got everything in first page
          cache[ALL_KEY] = { products: firstBatch, total: tot, ts: Date.now() }
          setProducts(firstBatch)
          setLoading(false)
          setProgress(100)
          return
        }

        // Load remaining pages
        const pages = Math.ceil(tot / PAGE_SIZE)
        const fetches = []
        for (let p = 2; p <= Math.min(pages, 30); p++) {
          fetches.push(fetchProducts({ page: p, limit: PAGE_SIZE }))
        }

        const results = await Promise.allSettled(fetches)
        let allProducts = [...firstBatch]

        for (const r of results) {
          if (r.status === 'fulfilled') {
            let batch = []
            if (Array.isArray(r.value.data)) batch = r.value.data
            else if (r.value.data?.list) batch = r.value.data.list
            allProducts = allProducts.concat(batch.map(normalizeProduct))
          }
        }

        cache[ALL_KEY] = { products: allProducts, total: tot, ts: Date.now() }
        setProducts(allProducts)
        setLoading(false)
        setProgress(100)
      })
      .catch(err => {
        console.error('Failed to load all products:', err)
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { products, total, loading, error, progress }
}

function normalizeProduct(p) {
  // Ensure isUnlimited is set from thirdPartyData or dataSize
  const isUnlimited = p.thirdPartyData?.isUnlimited || p.dataSize === 0
  return {
    ...p,
    isUnlimited,
    // Keep all original fields
  }
}
