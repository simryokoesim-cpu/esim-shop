import fs from 'node:fs/promises'

const API_BASE = 'https://ciuh32wky.xigrocoltd.com/api'
const LOCAL_ENV_FILE = '/home/adobe/.openclaw/workspace/secrets/local/vercel-mini-app-production-env-20260503-174016.env'

async function loadLocalEnvIfAvailable() {
  try {
    const text = await fs.readFile(LOCAL_ENV_FILE, 'utf8')
    for (const line of text.split(/\n/)) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
      const [key, ...rest] = trimmed.split('=')
      if (!process.env[key]) process.env[key] = rest.join('=').replace(/^['"]|['"]$/g, '')
    }
  } catch {}
}

async function supplierLogin() {
  await loadLocalEnvIfAvailable()
  const username = process.env.ESIM_API_USERNAME
  const password = process.env.ESIM_API_PASSWORD
  if (!username || !password) return null
  const res = await fetch(`${API_BASE}/agent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  })
  const body = await res.json().catch(() => null)
  if (!res.ok || !body?.success || !body?.data?.token) throw new Error(`Supplier login failed: HTTP ${res.status}`)
  return body.data.token
}

async function loadSupplierProducts() {
  const token = await supplierLogin()
  if (!token) return null
  const all = []
  for (let page = 1; page < 1000; page++) {
    const res = await fetch(`${API_BASE}/agent/products?${new URLSearchParams({ page, limit: 100 })}`, {
      headers: { Authorization: `Bearer ${token}` },
    })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.success) throw new Error(`Supplier products failed on page ${page}: HTTP ${res.status}`)
    const list = body.data?.list || []
    all.push(...list)
    const total = body.data?.total || all.length
    if (!list.length || all.length >= total) break
  }
  return all
}

export async function loadProductsSource({ baseUrl = 'https://app.simryoko.com', fileArg, includeFinancialLoss = false } = {}) {
  if (fileArg) {
    const raw = JSON.parse(await fs.readFile(fileArg, 'utf8'))
    if (Array.isArray(raw)) return { products: raw, source: fileArg }
    return { products: raw.data?.list || raw.products || raw.data || [], source: fileArg }
  }

  const supplierProducts = await loadSupplierProducts()
  if (supplierProducts) return { products: supplierProducts, source: 'supplier:ciuh32wky/agent/products' }

  const all = []
  const secret = process.env.PROFIT_AUDIT_SECRET
  for (let page = 1; page < 1000; page++) {
    const url = new URL(`${baseUrl.replace(/\/$/, '')}/api/products`)
    url.searchParams.set('page', String(page))
    url.searchParams.set('limit', '100')
    if (includeFinancialLoss && secret) url.searchParams.set('includeFinancialLoss', '1')
    const headers = includeFinancialLoss && secret ? { 'x-profit-audit-secret': secret } : {}
    const res = await fetch(url, { headers })
    const body = await res.json().catch(() => null)
    if (!res.ok || !body?.success) throw new Error(`Product API failed on page ${page}: HTTP ${res.status}`)
    const list = body.data?.list || []
    all.push(...list)
    const total = body.data?.total || all.length
    if (!list.length || all.length >= total) break
  }
  return { products: all, source: baseUrl.replace(/\/$/, '') }
}
