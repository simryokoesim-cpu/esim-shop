// Backend proxy for orders API
// Supabase key never exposed to frontend

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://afdyzuohzwdvreyhnfdb.supabase.co'
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, X-Telegram-Id')

  if (req.method === 'OPTIONS') return res.status(200).end()

  const tgId = req.headers['x-telegram-id']

  try {
    if (req.method === 'POST') {
      // 创建订单
      const order = req.body
      
      // 安全检查：tg_id 必须与 header 一致
      if (tgId && order.tg_id && order.tg_id !== tgId) {
        return res.status(403).json({ error: 'Forbidden' })
      }

      const r = await fetch(`${SUPABASE_URL}/rest/v1/miniapp_orders`, {
        method: 'POST',
        headers: {
          'apikey': SUPABASE_KEY,
          'Authorization': `Bearer ${SUPABASE_KEY}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(order)
      })

      if (!r.ok) {
        const err = await r.json()
        return res.status(r.status).json(err)
      }

      return res.status(201).json({ success: true })

    } else if (req.method === 'GET') {
      // 查询订单 - 只能查自己的
      if (!tgId || tgId === '0') {
        return res.status(200).json([])
      }

      const r = await fetch(
        `${SUPABASE_URL}/rest/v1/miniapp_orders?tg_id=eq.${tgId}&order=created_at.desc`,
        {
          headers: {
            'apikey': SUPABASE_KEY,
            'Authorization': `Bearer ${SUPABASE_KEY}`
          }
        }
      )

      const data = await r.json()
      return res.status(200).json(data)
    }

    return res.status(405).json({ error: 'Method not allowed' })

  } catch (error) {
    console.error('Orders API Error:', error)
    return res.status(500).json({ error: 'Internal server error' })
  }
}
