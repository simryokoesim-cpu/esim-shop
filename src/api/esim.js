// eSIM API client - now uses backend proxy instead of direct API access
// Credentials are no longer exposed in frontend code

const API_BASE = '/api' // Relative path to backend proxy

export async function fetchProducts({ page = 1, limit = 20, search = '', country = '' } = {}) {
  const params = new URLSearchParams({ page, limit })
  if (search) params.set('keyword', search)
  if (country) params.set('country', country)
  
  const res = await fetch(`${API_BASE}/products?${params}`)
  
  if (!res.ok) {
    throw new Error('Failed to fetch products')
  }
  
  return res.json()
}

export async function fetchProductById(id) {
  const res = await fetch(`${API_BASE}/products?id=${id}&limit=1`)
  
  if (res.ok) {
    const data = await res.json()
    if (Array.isArray(data.data)) {
      return data.data.find(p => p.id === parseInt(id)) || null
    }
    if (data.data?.list) {
      return data.data.list.find(p => p.id === parseInt(id)) || null
    }
  }
  return null
}
