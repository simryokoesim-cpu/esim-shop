// Backend proxy for eSIM products API
// This keeps credentials secure on the server side

const API_BASE = 'https://ciuh32wky.xigrocoltd.com/api'
const CREDENTIALS = {
  username: process.env.ESIM_API_USERNAME || 'tgesim',
  password: process.env.ESIM_API_PASSWORD || '123123'
}

let cachedToken = null
let tokenExpiry = 0

async function login() {
  const res = await fetch(`${API_BASE}/agent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(CREDENTIALS),
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
    const { page = 1, limit = 20, search = '', country = '' } = req.query
    const params = new URLSearchParams({ page, limit })
    if (search) params.set('keyword', search)
    if (country) params.set('country', country)
    
    const apiRes = await fetch(`${API_BASE}/agent/products?${params}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    
    if (apiRes.status === 401) {
      // Token expired, re-login
      cachedToken = null
      const newToken = await login()
      const retryRes = await fetch(`${API_BASE}/agent/products?${params}`, {
        headers: { Authorization: `Bearer ${newToken}` },
      })
      const data = await retryRes.json()
      return res.status(200).json(data)
    }
    
    const data = await apiRes.json()
    return res.status(200).json(data)
    
  } catch (error) {
    console.error('API Error:', error)
    return res.status(500).json({ 
      success: false, 
      message: 'Internal server error' 
    })
  }
}
