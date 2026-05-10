import crypto from 'crypto'
import handler from '../api/v1/orders.js'

const BOT_TOKEN = '123456:test-token'
process.env.MINIAPP_BOT_TOKEN = BOT_TOKEN
process.env.SUPABASE_SERVICE_KEY = 'not-used-for-invalid-auth'

global.fetch = async () => {
  throw new Error('fetch must not be called when initData auth fails')
}

function signInitData(fields, botToken = BOT_TOKEN) {
  const params = new URLSearchParams()
  for (const [key, value] of Object.entries(fields)) params.set(key, value)

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest()
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex')
  params.set('hash', hash)
  return params.toString()
}

function createRes() {
  return {
    statusCode: 200,
    headers: {},
    body: undefined,
    setHeader(key, value) { this.headers[key] = value },
    status(code) { this.statusCode = code; return this },
    json(value) { this.body = value; return this },
    end() { this.ended = true; return this },
  }
}

async function expectRejected(name, initData, expectedError) {
  const req = {
    method: 'POST',
    headers: {
      origin: 'https://app.simryoko.com',
      'x-telegram-init-data': initData,
    },
    body: {
      id: `TEST_${name}`,
      tg_id: 'attacker-controlled',
      product_id: 'p1',
      product_name: 'Test Product',
      amount: '1',
    },
    query: {},
  }
  const res = createRes()
  await handler(req, res)

  if (res.statusCode !== 403 || res.body?.error !== expectedError) {
    console.error(`${name}: expected 403 ${expectedError}, got:`, res.statusCode, res.body)
    process.exit(1)
  }
  console.log(`PASS ${name} rejected with 403 ${expectedError}`)
}

await expectRejected(
  'forged-signature',
  'auth_date=9999999999&user=%7B%22id%22%3A7867683484%7D&hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  'BAD_SIGNATURE',
)

const expiredInitData = signInitData({
  auth_date: String(Math.floor(Date.now() / 1000) - 25 * 60 * 60),
  user: JSON.stringify({ id: 7867683484 }),
})
await expectRejected('expired-auth-date', expiredInitData, 'EXPIRED')
