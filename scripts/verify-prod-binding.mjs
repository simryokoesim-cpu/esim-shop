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

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: projectRoot,
    stdio: 'pipe',
    text: true,
    env: process.env,
  })
  return {
    ok: result.status === 0,
    status: result.status,
    output: `${result.stdout || ''}${result.stderr || ''}`,
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runWithRetry(command, args, options = {}) {
  const attempts = options.attempts || 1
  const delayMs = options.delayMs || 0
  let last = null
  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const result = run(command, args)
    last = { ...result, attempt }
    if (result.ok) return last
    if (attempt < attempts && delayMs > 0) await sleep(delayMs)
  }
  return last
}

function resolveVercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN.trim()
  if (fs.existsSync(localTokenFile)) return fs.readFileSync(localTokenFile, 'utf8').trim()
  return ''
}

function checkProjectBinding(checks) {
  const projectFile = new URL('../.vercel/project.json', import.meta.url)
  if (!fs.existsSync(projectFile)) {
    checks.push({ name: 'vercel-binding-file', ok: false, detail: 'missing .vercel/project.json' })
    return
  }

  let binding
  try {
    binding = JSON.parse(fs.readFileSync(projectFile, 'utf8'))
  } catch (error) {
    checks.push({ name: 'vercel-binding-file', ok: false, detail: `invalid JSON: ${error.message}` })
    return
  }

  for (const key of ['projectId', 'orgId', 'projectName']) {
    checks.push({
      name: `vercel-binding-${key}`,
      ok: binding[key] === expected[key],
      expected: expected[key],
      actual: binding[key] || null,
    })
  }
}

async function checkToken(checks, token) {
  checks.push({ name: 'vercel-token-present', ok: Boolean(token), source: process.env.VERCEL_TOKEN ? 'env' : (token ? 'local-secret-file' : 'missing') })
  if (!token) return

  const whoami = run('vercel', ['whoami', '--token', token])
  checks.push({ name: 'vercel-token-whoami', ok: whoami.ok, detail: whoami.ok ? whoami.output.trim().split('\n')[0] : 'whoami failed' })

  const inspect = await runWithRetry('vercel', ['project', 'inspect', expected.projectId, '--token', token], { attempts: 3, delayMs: 1500 })
  checks.push({
    name: 'vercel-token-project-access',
    ok: inspect.ok && inspect.output.includes(expected.projectId) && inspect.output.includes(expected.projectName),
    severity: 'warn',
    attempts: inspect.attempt,
    expectedProjectId: expected.projectId,
    expectedProjectName: expected.projectName,
    detail: inspect.ok ? 'project inspect completed' : 'project inspect failed after retry',
  })
}

async function fetchText(url) {
  const started = Date.now()
  const res = await fetch(url, { redirect: 'follow' })
  const text = await res.text()
  return { status: res.status, elapsedMs: Date.now() - started, text }
}

async function checkCanonical(checks) {
  const version = await fetchText(`${expected.canonicalUrl}/deploy-version.json?verify=${Date.now()}`)
  let versionJson = null
  try { versionJson = JSON.parse(version.text) } catch {}
  checks.push({
    name: 'canonical-deploy-version',
    ok: version.status === 200 && Boolean(versionJson?.gitCommit),
    status: version.status,
    elapsedMs: version.elapsedMs,
    gitCommit: versionJson?.gitCommit || null,
  })

  const product = await fetchText(`${expected.canonicalUrl}/api/products?id=${expected.smokeProductId}&limit=1&verify=${Date.now()}`)
  let productJson = null
  try { productJson = JSON.parse(product.text) } catch {}
  const item = productJson?.data?.list?.[0]
  checks.push({
    name: 'canonical-product-smoke',
    ok: product.status === 200 && String(item?.id) === expected.smokeProductId,
    status: product.status,
    elapsedMs: product.elapsedMs,
    id: item?.id || null,
    nameCn: item?.name || null,
  })

  const orders = await fetchText(`${expected.canonicalUrl}/api/orders?verify=${Date.now()}`)
  checks.push({
    name: 'canonical-orders-auth-guard',
    ok: orders.status === 403,
    status: orders.status,
    elapsedMs: orders.elapsedMs,
  })
}

const checks = []
checkProjectBinding(checks)
const token = resolveVercelToken()
await checkToken(checks, token)
await checkCanonical(checks)

const hardFailures = checks.filter(check => !check.ok && check.severity !== 'warn')
const ok = hardFailures.length === 0
const result = {
  ok,
  generatedAt: new Date().toISOString(),
  canonicalUrl: expected.canonicalUrl,
  expectedProject: {
    projectId: expected.projectId,
    orgId: expected.orgId,
    projectName: expected.projectName,
  },
  checks,
}

console.log(JSON.stringify(result, null, 2))
process.exit(ok ? 0 : 1)
