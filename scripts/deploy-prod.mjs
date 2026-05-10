#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const projectRoot = new URL('..', import.meta.url).pathname
const localTokenFile = '/home/adobe/.openclaw/workspace/secrets/local/vercel-token-current.txt'
const expected = {
  projectId: 'prj_IfMYvAnKBYhVspywixPYS7KCIufM',
  orgId: 'team_TccWQYWOjgPpNxgbTOQ43Jwd',
  projectName: 'mini-app',
  canonicalUrl: 'https://app.simryoko.com',
  smokeProductId: '141',
}

function printableArgs(args) {
  return args.map((arg, index) => {
    if (args[index - 1] === '--token') return '<redacted>'
    return /\s/.test(arg) ? JSON.stringify(arg) : arg
  })
}

function run(command, args, options = {}) {
  console.log(`\n$ ${[command, ...printableArgs(args)].join(' ')}`)
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: options.capture ? 'pipe' : 'inherit',
    text: true,
    env: { ...process.env, ...(options.env || {}) },
  })
  if (result.status !== 0) {
    if (options.capture) process.stderr.write(result.stdout + result.stderr)
    process.exit(result.status || 1)
  }
  return result
}

function fail(message) {
  console.error(`\n[deploy:prod][blocked] ${message}`)
  process.exit(1)
}

function currentGitCommit() {
  const result = run('git', ['rev-parse', '--short', 'HEAD'], { capture: true })
  return String(result.stdout).trim()
}

function resolveVercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN.trim()
  if (fs.existsSync(localTokenFile)) return fs.readFileSync(localTokenFile, 'utf8').trim()
  return ''
}

function assertProjectBinding() {
  const projectFile = new URL('../.vercel/project.json', import.meta.url)
  if (!fs.existsSync(projectFile)) fail('Missing .vercel/project.json; refusing to deploy without explicit production binding.')
  const binding = JSON.parse(fs.readFileSync(projectFile, 'utf8'))
  for (const key of ['projectId', 'orgId', 'projectName']) {
    if (binding[key] !== expected[key]) {
      fail(`Vercel binding mismatch for ${key}: got ${binding[key]}, expected ${expected[key]}. Do not relink; restore the production binding first.`)
    }
  }
  console.log(`[deploy:prod] Binding OK: ${binding.projectName} / ${binding.projectId}`)
}

function assertTokenCanAccessProductionProject(token) {
  const result = run('vercel', ['project', 'inspect', expected.projectId, '--token', token], { capture: true })
  const output = `${result.stdout}\n${result.stderr}`
  if (!output.includes(expected.projectId) || !output.includes(expected.projectName)) {
    fail('Token did not inspect the expected production project. Refusing deploy.')
  }
  console.log('[deploy:prod] Token scope OK for production project')
}

async function fetchJson(url) {
  const started = Date.now()
  const res = await fetch(url, { redirect: 'follow' })
  const text = await res.text()
  const elapsedMs = Date.now() - started
  let json = null
  try { json = JSON.parse(text) } catch {}
  return { url, status: res.status, elapsedMs, text, json }
}

async function verifyProduction() {
  const expectedCommit = currentGitCommit()
  const version = await fetchJson(`${expected.canonicalUrl}/deploy-version.json?verify=${Date.now()}`)
  if (version.status !== 200 || version.json?.gitCommit !== expectedCommit) {
    fail(`Canonical deploy-version check failed: expected gitCommit ${expectedCommit}, got ${version.json?.gitCommit || 'missing'}; HTTP ${version.status}, body=${version.text.slice(0, 200)}`)
  }

  const product = await fetchJson(`${expected.canonicalUrl}/api/products?id=${expected.smokeProductId}&limit=1&verify=${Date.now()}`)
  const item = product.json?.data?.list?.[0]
  if (product.status !== 200 || String(item?.id) !== expected.smokeProductId) {
    fail(`Canonical product smoke check failed: HTTP ${product.status}, body=${product.text.slice(0, 200)}`)
  }

  const orders = await fetchJson(`${expected.canonicalUrl}/api/orders?verify=${Date.now()}`)
  if (orders.status !== 403) {
    fail(`Canonical /api/orders auth guard expected HTTP 403, got HTTP ${orders.status}`)
  }

  console.log('\n[deploy:prod] Canonical production verification OK')
  console.log(JSON.stringify({
    canonicalUrl: expected.canonicalUrl,
    deployVersion: version.json,
    productSmoke: { status: product.status, elapsedMs: product.elapsedMs, id: item.id, name: item.name, price: item.price },
    ordersGuard: { status: orders.status, elapsedMs: orders.elapsedMs },
  }, null, 2))
}

const token = resolveVercelToken()
if (!token) fail('No Vercel token found in VERCEL_TOKEN or protected local token file; refusing to fall back to CLI login state.')

assertProjectBinding()
assertTokenCanAccessProductionProject(token)
run('vercel', ['--prod', '--yes', '--token', token])
await verifyProduction()
