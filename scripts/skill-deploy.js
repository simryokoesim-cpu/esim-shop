#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const root = new URL('..', import.meta.url).pathname
const args = new Set(process.argv.slice(2))

function run(command, commandArgs, options = {}) {
  const printable = [command, ...commandArgs].join(' ')
  console.log(`$ ${printable.replace(/--token\s+\S+/g, '--token <redacted>')}`)
  const result = spawnSync(command, commandArgs, { cwd: root, stdio: 'inherit', env: { ...process.env, ...(options.env || {}) } })
  if (result.status !== 0) process.exit(result.status || 1)
}

export function runPredeployGate() {
  run('node', ['scripts/verify-product-schema.mjs', '--fail-on-warn'])
  run('node', ['scripts/profit-audit-report.mjs', '--out=/home/adobe/.openclaw/workspace/reports/miniapp-profit-audit-predeploy-latest.json'])
  run('npm', ['run', 'build'])
  run('node', ['scripts/write-deploy-version.mjs'])
}

export function resolveVercelToken() {
  const localTokenFile = '/home/adobe/.openclaw/workspace/secrets/local/vercel-token-current.txt'
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN
  if (fs.existsSync(localTokenFile)) return fs.readFileSync(localTokenFile, 'utf8').trim()
  return ''
}

export function deployVercelProd() {
  const token = resolveVercelToken()
  const vercelArgs = ['--prod', '--yes']
  if (token) vercelArgs.push('--token', token)
  run('vercel', vercelArgs)
}

if (args.has('--predeploy')) runPredeployGate()
if (args.has('--deploy')) deployVercelProd()
