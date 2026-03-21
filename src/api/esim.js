// eSIM API client with token auto-refresh

const API_BASE = 'https://ciuh32wky.xigrocoltd.com/api'
const CREDENTIALS = { username: 'tgesim', password: '123123' }
const TOKEN_KEY = 'esim_token'
const TOKEN_EXP_KEY = 'esim_token_exp'

async function login() {
  const res = await fetch(`${API_BASE}/agent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS),
  })
  const data = await res.json()
  if (!data.success) throw new Error('Login failed: ' + data.message)
  const token = data.data.token
  // Store token with expiry (expire 5min before actual exp to be safe)
  const exp = Date.now() + 23 * 60 * 60 * 1000 // 23h
  sessionStorage.setItem(TOKEN_KEY, token)
  sessionStorage.setItem(TOKEN_EXP_KEY, String(exp))
  return token
}

async function getToken() {
  const token = sessionStorage.getItem(TOKEN_KEY)
  const exp = parseInt(sessionStorage.getItem(TOKEN_EXP_KEY) || '0')
  if (token && Date.now() < exp) return token
  return await login()
}

export async function fetchProducts({ page = 1, limit = 20, search = '', country = '' } = {}) {
  const token = await getToken()
  const params = new URLSearchParams({ page, limit })
  if (search) params.set('keyword', search)
  if (country) params.set('country', country)
  
  const res = await fetch(`${API_BASE}/agent/products?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (res.status === 401) {
    // Token expired, force re-login
    sessionStorage.removeItem(TOKEN_KEY)
    const newToken = await login()
    const res2 = await fetch(`${API_BASE}/agent/products?${params}`, {
      headers: { Authorization: `Bearer ${newToken}` },
    })
    return res2.json()
  }

  return res.json()
}

export async function fetchProductById(id) {
  const token = await getToken()
  const res = await fetch(`${API_BASE}/agent/products?id=${id}&limit=1`, {
    headers: { Authorization: `Bearer ${token}` },
  })
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
