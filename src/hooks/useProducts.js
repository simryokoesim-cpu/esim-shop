import { useState, useEffect } from 'react'

let cachedProducts = null

export function useProducts() {
  const [products, setProducts] = useState(cachedProducts || [])
  const [loading, setLoading] = useState(!cachedProducts)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (cachedProducts) return

    fetch('./products.json')
      .then(r => r.json())
      .then(data => {
        cachedProducts = data
        setProducts(data)
        setLoading(false)
      })
      .catch(err => {
        setError(err.message)
        setLoading(false)
      })
  }, [])

  return { products, loading, error }
}
