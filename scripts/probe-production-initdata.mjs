#!/usr/bin/env node
/** Production negative probe: forged Telegram initData must be rejected before any DB write. */
const baseUrl = process.argv.find(arg => arg.startsWith('--base-url='))?.slice('--base-url='.length) || 'https://app.simryoko.com'
const endpoint = `${baseUrl.replace(/\/$/, '')}/api/orders`

const forgedInitData = 'auth_date=9999999999&user=%7B%22id%22%3A7867683484%7D&hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa'

const res = await fetch(endpoint, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'X-Telegram-Init-Data': forgedInitData,
  },
  body: JSON.stringify({
    id: `FORGED_${Date.now()}`,
    tg_id: 'attacker-controlled',
    product_id: 'probe-only',
    product_name: 'Forged Probe Product',
    amount: '0',
  }),
})

let body = {}
try { body = await res.json() } catch {}

const ok = res.status === 403 && body?.error === 'BAD_SIGNATURE'
console.log(JSON.stringify({ ok, endpoint, status: res.status, error: body?.error || null }, null, 2))
process.exit(ok ? 0 : 1)
