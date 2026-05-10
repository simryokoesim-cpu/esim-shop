#!/usr/bin/env node
/**
 * Read-only secret verifier for post-rotation checks.
 *
 * Safety rules:
 * - Does not print secret values.
 * - Does not create supplier orders, payments, DB rows, or webhooks.
 * - Network checks require --live so static CI can run without touching providers.
 */

import fs from 'fs'
import path from 'path'

function loadEnvFile(file) {
  if (!fs.existsSync(file)) return false
  const raw = fs.readFileSync(file, 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) continue
    const idx = trimmed.indexOf('=')
    const key = trimmed.slice(0, idx).trim()
    let value = trimmed.slice(idx + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    if (key && process.env[key] == null) process.env[key] = value
  }
  return true
}

const argv = process.argv.slice(2)
const envFileArg = argv.find(arg => arg.startsWith('--env-file='))
if (envFileArg) {
  loadEnvFile(path.resolve(envFileArg.slice('--env-file='.length)))
} else {
  loadEnvFile(path.resolve(process.cwd(), '.env.local'))
  loadEnvFile(path.resolve(process.cwd(), '.env'))
  loadEnvFile(path.resolve(process.cwd(), '../..', '.env'))
}

const args = new Set(argv)
const LIVE = args.has('--live')

const CHECKS = {
  supplier: args.has('--supplier') || args.has('--all'),
  supabase: args.has('--supabase') || args.has('--all'),
  stripe: args.has('--stripe') || args.has('--all'),
  telegram: args.has('--telegram') || args.has('--all'),
}

if (!Object.values(CHECKS).some(Boolean)) {
  CHECKS.supplier = true
  CHECKS.supabase = true
  CHECKS.stripe = true
  CHECKS.telegram = true
}

function maskStatus(name, value) {
  return { name, present: Boolean(value), length: value ? String(value).length : 0 }
}

function getEnv(...names) {
  for (const name of names) {
    if (process.env[name]) return { name, value: process.env[name] }
  }
  return { name: names[0], value: '' }
}

function requireEnv(label, ...names) {
  const hit = getEnv(...names)
  if (!hit.value) throw new Error(`${label}: missing one of ${names.join(', ')}`)
  return hit
}

async function readJson(res) {
  const text = await res.text()
  try { return JSON.parse(text) } catch { return { raw: text.slice(0, 120) } }
}

async function verifySupplier() {
  const endpoint = getEnv('ESIM_API_ENDPOINT', 'ESIM_API_BASE').value || 'https://ciuh32wky.xigrocoltd.com'
  const username = requireEnv('supplier username', 'ESIM_API_USERNAME', 'ESIM_API_USER', 'ESIM_USER')
  const password = requireEnv('supplier password', 'ESIM_API_PASSWORD', 'ESIM_API_PASS', 'ESIM_PASS')

  const presence = [maskStatus(username.name, username.value), maskStatus(password.name, password.value)]
  if (!LIVE) return { ok: true, skipped: 'network disabled; pass --live', presence }

  const login = await fetch(`${endpoint.replace(/\/$/, '')}/api/agent/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: username.value, password: password.value }),
  })
  const loginData = await readJson(login)
  const token = loginData?.data?.token
  if (!login.ok || !token) return { ok: false, status: login.status, error: loginData?.message || 'SUPPLIER_LOGIN_FAILED', presence }

  const info = await fetch(`${endpoint.replace(/\/$/, '')}/api/agent/info`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const infoData = await readJson(info)
  return {
    ok: info.ok,
    status: info.status,
    balancePresent: infoData?.data?.balance != null,
    presence,
  }
}

async function verifySupabase() {
  const url = requireEnv('supabase url', 'SUPABASE_URL', 'ESIM_SUPABASE_PROJECT_URL')
  const key = requireEnv('supabase service key', 'SUPABASE_SERVICE_KEY', 'SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_KEY', 'ESIM_SUPABASE_PAT')
  const presence = [maskStatus(url.name, url.value), maskStatus(key.name, key.value)]
  if (!LIVE) return { ok: true, skipped: 'network disabled; pass --live', presence }

  const base = url.value.replace(/\/$/, '')
  const res = await fetch(`${base}/rest/v1/miniapp_orders?select=id&limit=1`, {
    headers: {
      apikey: key.value,
      Authorization: `Bearer ${key.value}`,
    },
  })
  return { ok: res.ok, status: res.status, presence }
}

async function verifyStripe() {
  const key = requireEnv('stripe secret', 'STRIPE_SECRET_KEY')
  const presence = [maskStatus(key.name, key.value)]
  if (!LIVE) return { ok: true, skipped: 'network disabled; pass --live', presence }

  const res = await fetch('https://api.stripe.com/v1/balance', {
    headers: { Authorization: `Bearer ${key.value}` },
  })
  return { ok: res.ok, status: res.status, presence }
}

async function verifyTelegram() {
  const token = requireEnv('miniapp/bot token', 'MINIAPP_BOT_TOKEN', 'SIMRYOKO_BOT_TOKEN', 'TG_BOT_TOKEN', 'BOT_TOKEN')
  const presence = [maskStatus(token.name, token.value)]
  if (!LIVE) return { ok: true, skipped: 'network disabled; pass --live', presence }

  const res = await fetch(`https://api.telegram.org/bot${token.value}/getMe`)
  const data = await readJson(res)
  return { ok: Boolean(res.ok && data?.ok), status: res.status, usernamePresent: Boolean(data?.result?.username), presence }
}

const runners = {
  supplier: verifySupplier,
  supabase: verifySupabase,
  stripe: verifyStripe,
  telegram: verifyTelegram,
}

const results = {}
let failed = false
for (const [name, enabled] of Object.entries(CHECKS)) {
  if (!enabled) continue
  try {
    const result = await runners[name]()
    results[name] = result
    if (!result.ok) failed = true
  } catch (error) {
    results[name] = { ok: false, error: error.message }
    failed = true
  }
}

console.log(JSON.stringify({ ok: !failed, live: LIVE, results }, null, 2))
process.exit(failed ? 1 : 0)
