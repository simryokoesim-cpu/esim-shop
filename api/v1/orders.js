// Whitelisted Miniapp orders API.
// Trust boundary: tg_id only comes from Telegram WebApp initData signature verification.

import { requireTelegramUser } from '../_telegramAuth.js'

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://afdyzuohzwdvreyhnfdb.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY

const ALLOWED_ORIGINS = new Set([
  'https://app.simryoko.com',
  'https://mini-app-two-kappa.vercel.app',
  'http://localhost:5173',
])

function setCors(req, res) {
  const origin = req.headers?.origin
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin)
    res.setHeader('Vary', 'Origin')
  }
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PATCH, HEAD, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Init-Data')
}

function supabaseHeaders(extra = {}) {
  if (!SUPABASE_KEY) throw new Error('SUPABASE_SERVICE_KEY_NOT_CONFIGURED')
  return {
    apikey: SUPABASE_KEY,
    Authorization: `Bearer ${SUPABASE_KEY}`,
    ...extra,
  }
}

function publicOrderPayload(input, req) {
  const order = input || {}
  return {
    id: order.id,
    tg_id: req.user.tg_id,
    tg_username: order.tg_username || order.tgUsername || 'unknown',
    product_id: String(order.product_id ?? order.productId ?? ''),
    product_name: order.product_name ?? order.productName ?? null,
    amount: String(order.amount ?? order.price ?? 0),
    currency: order.currency || 'USD',
    settlement_amount: order.settlement_amount ?? order.settlementAmount ?? null,
    settlement_currency: order.settlement_currency ?? order.settlementCurrency ?? null,
    payment_method: order.payment_method ?? order.paymentMethod ?? null,
    status: 'pending_payment',
    created_at: order.created_at || new Date().toISOString(),
    referral_code: order.referral_code ?? order.referralCode ?? null,
  }
}

function validateCreatePayload(order) {
  if (!order.id || typeof order.id !== 'string') return 'MISSING_ORDER_ID'
  if (!order.product_id || !String(order.product_id).trim()) return 'MISSING_PRODUCT_ID'
  if (!order.product_name || typeof order.product_name !== 'string') return 'MISSING_PRODUCT_NAME'
  if (!Number.isFinite(Number(order.amount)) || Number(order.amount) < 0) return 'BAD_AMOUNT'
  return null
}

async function getCanonicalProduct(req, productId) {
  const host = req.headers?.host
  if (!host) throw new Error('MISSING_HOST')
  const protocol = String(req.headers?.['x-forwarded-proto'] || 'https').split(',')[0].trim() || 'https'
  const url = `${protocol}://${host}/api/products?id=${encodeURIComponent(productId)}&limit=1`
  const r = await fetch(url)
  const data = await r.json()
  if (!r.ok || !data?.success) throw new Error('PRODUCT_LOOKUP_FAILED')
  return data?.data?.list?.[0] || null
}

function assertCanonicalOrder(order, product) {
  if (!product) return 'PRODUCT_NOT_FOUND'
  const expectedAmount = Number(product.price)
  const receivedAmount = Number(order.amount)
  if (!Number.isFinite(expectedAmount) || expectedAmount < 0) return 'BAD_PRODUCT_PRICE'
  if (!Number.isFinite(receivedAmount) || Math.abs(receivedAmount - expectedAmount) > 0.01) return 'AMOUNT_MISMATCH'
  order.product_id = String(product.id)
  order.product_name = product.name || product.nameEn || order.product_name
  order.amount = String(product.price)
  order.currency = 'USD'
  return null
}

function paymentSelectionPayload(input) {
  const body = input || {}
  const paymentMethod = String(body.payment_method ?? body.paymentMethod ?? '').toLowerCase()
  if (!['usdt', 'ton'].includes(paymentMethod)) return { error: 'BAD_PAYMENT_METHOD' }

  const settlementAmount = body.settlement_amount ?? body.settlementAmount ?? body.amount
  const settlementCurrency = String(body.settlement_currency ?? body.settlementCurrency ?? body.currency ?? '').toUpperCase()
  if (!Number.isFinite(Number(settlementAmount)) || Number(settlementAmount) < 0) return { error: 'BAD_SETTLEMENT_AMOUNT' }
  if (!settlementCurrency) return { error: 'BAD_SETTLEMENT_CURRENCY' }

  return {
    payload: {
      payment_method: paymentMethod,
      settlement_amount: String(settlementAmount),
      settlement_currency: settlementCurrency,
    },
  }
}

export default async function handler(req, res) {
  setCors(req, res)

  if (req.method === 'OPTIONS') return res.status(200).end()
  if (req.method === 'HEAD') return res.status(200).end()

  try {
    const auth = requireTelegramUser(req)
    if (!auth.ok) return res.status(auth.status).json({ error: auth.error })

    if (req.method === 'POST') {
      const order = publicOrderPayload(req.body, req)
      const payloadError = validateCreatePayload(order)
      if (payloadError) return res.status(400).json({ error: payloadError })

      const product = await getCanonicalProduct(req, order.product_id)
      const canonicalError = assertCanonicalOrder(order, product)
      if (canonicalError) return res.status(400).json({ error: canonicalError })

      const r = await fetch(`${SUPABASE_URL}/rest/v1/miniapp_orders`, {
        method: 'POST',
        headers: supabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        }),
        body: JSON.stringify(order),
      })

      if (!r.ok) {
        const text = await r.text()
        let err
        try { err = JSON.parse(text) } catch { err = { error: text || 'SUPABASE_WRITE_FAILED' } }
        return res.status(r.status).json(err)
      }

      return res.status(201).json({ success: true, id: order.id })
    }

    if (req.method === 'PATCH') {
      const orderId = req.body?.id || req.query?.id
      if (!orderId || typeof orderId !== 'string') return res.status(400).json({ error: 'MISSING_ORDER_ID' })
      const selection = paymentSelectionPayload(req.body)
      if (selection.error) return res.status(400).json({ error: selection.error })

      const r = await fetch(`${SUPABASE_URL}/rest/v1/miniapp_orders?id=eq.${encodeURIComponent(orderId)}&tg_id=eq.${encodeURIComponent(req.user.tg_id)}&status=in.(pending,pending_payment)`, {
        method: 'PATCH',
        headers: supabaseHeaders({
          'Content-Type': 'application/json',
          Prefer: 'return=representation',
        }),
        body: JSON.stringify(selection.payload),
      })

      const text = await r.text()
      let data
      try { data = JSON.parse(text) } catch { data = text }
      if (!r.ok) return res.status(r.status).json(data || { error: 'SUPABASE_PATCH_FAILED' })
      if (Array.isArray(data) && data.length === 0) return res.status(404).json({ error: 'ORDER_NOT_FOUND' })
      return res.status(200).json({ success: true, id: orderId })
    }

    if (req.method === 'GET') {
      const orderId = req.query?.id
      const query = orderId
        ? `${SUPABASE_URL}/rest/v1/miniapp_orders?id=eq.${encodeURIComponent(orderId)}&tg_id=eq.${encodeURIComponent(req.user.tg_id)}&select=*`
        : `${SUPABASE_URL}/rest/v1/miniapp_orders?tg_id=eq.${encodeURIComponent(req.user.tg_id)}&order=created_at.desc`

      const r = await fetch(query, { headers: supabaseHeaders() })
      const data = await r.json()
      return res.status(r.status).json(data)
    }

    return res.status(405).json({ error: 'METHOD_NOT_ALLOWED' })
  } catch (error) {
    console.error('Orders API Error:', error?.message || error)
    return res.status(500).json({ error: 'INTERNAL_SERVER_ERROR' })
  }
}
