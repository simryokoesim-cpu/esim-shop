import handler from '../api/v1/orders.js'

process.env.MINIAPP_BOT_TOKEN = '123456:test-token'
process.env.SUPABASE_SERVICE_KEY = 'not-used-for-invalid-auth'

global.fetch = async () => {
  throw new Error('fetch must not be called when initData signature is invalid')
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

const req = {
  method: 'POST',
  headers: {
    origin: 'https://app.simryoko.com',
    'x-telegram-init-data': 'auth_date=9999999999&user=%7B%22id%22%3A7867683484%7D&hash=aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa',
  },
  body: {
    id: 'FORGED_ORDER',
    tg_id: 'attacker-controlled',
    product_id: 'p1',
    product_name: 'Forged Product',
    amount: '1',
  },
  query: {},
}

const res = createRes()
await handler(req, res)

if (res.statusCode !== 403 || res.body?.error !== 'BAD_SIGNATURE') {
  console.error('Expected forged initData to return 403 BAD_SIGNATURE, got:', res.statusCode, res.body)
  process.exit(1)
}

console.log('PASS forged initData rejected with 403 BAD_SIGNATURE')
