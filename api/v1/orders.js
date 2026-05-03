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
      return res.status(403).json({
        error: 'PATCH_DISABLED',
        message: 'Payment selection updates remain disabled until the dedicated /api/v1/orders/:id/payment-selection endpoint is implemented.',
      })
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
