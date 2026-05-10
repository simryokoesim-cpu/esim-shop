import crypto from 'crypto'

const DEFAULT_MAX_AGE_SECONDS = 24 * 60 * 60

export function getMiniappBotToken() {
  return process.env.MINIAPP_BOT_TOKEN
    || process.env.SIMRYOKO_BOT_TOKEN
    || process.env.TG_BOT_TOKEN
    || process.env.BOT_TOKEN
    || ''
}

export function validateTgInitData(initData, botToken, options = {}) {
  const maxAgeSeconds = options.maxAgeSeconds ?? DEFAULT_MAX_AGE_SECONDS
  if (!initData || !botToken) return { ok: false, error: 'MISSING_INPUT' }

  const params = new URLSearchParams(initData)
  const hash = params.get('hash')
  if (!hash) return { ok: false, error: 'MISSING_HASH' }
  if (!/^[0-9a-f]{64}$/i.test(hash)) return { ok: false, error: 'BAD_HASH_FORMAT' }
  params.delete('hash')

  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secretKey = crypto
    .createHmac('sha256', 'WebAppData')
    .update(botToken)
    .digest()

  const calculatedHash = crypto
    .createHmac('sha256', secretKey)
    .update(dataCheckString)
    .digest('hex')

  try {
    const expected = Buffer.from(calculatedHash, 'hex')
    const actual = Buffer.from(hash, 'hex')
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      return { ok: false, error: 'BAD_SIGNATURE' }
    }
  } catch {
    return { ok: false, error: 'BAD_HASH_FORMAT' }
  }

  const authDate = Number(params.get('auth_date') || 0)
  if (!Number.isFinite(authDate) || authDate <= 0) {
    return { ok: false, error: 'BAD_AUTH_DATE' }
  }
  if (Date.now() / 1000 - authDate > maxAgeSeconds) {
    return { ok: false, error: 'EXPIRED' }
  }

  const rawUser = params.get('user')
  if (!rawUser) return { ok: false, error: 'MISSING_USER' }

  let user = null
  try {
    user = JSON.parse(rawUser)
  } catch {
    return { ok: false, error: 'BAD_USER_JSON' }
  }

  if (!user?.id) return { ok: false, error: 'MISSING_USER_ID' }
  return { ok: true, user, params: Object.fromEntries(params.entries()) }
}

export function extractInitData(req) {
  return req.headers?.['x-telegram-init-data']
    || req.headers?.['X-Telegram-Init-Data']
    || req.body?.initData
    || req.query?.initData
    || ''
}

export function requireTelegramUser(req) {
  const botToken = getMiniappBotToken()
  if (!botToken) return { ok: false, status: 503, error: 'MINIAPP_BOT_TOKEN_NOT_CONFIGURED' }

  const verified = validateTgInitData(extractInitData(req), botToken)
  if (!verified.ok) return { ok: false, status: 403, error: verified.error }

  const user = { tg_id: String(verified.user.id) }
  req.user = user
  return { ok: true, tgId: user.tg_id, user }
}

export const verifyTelegramInitData = validateTgInitData
