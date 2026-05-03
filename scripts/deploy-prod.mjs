#!/usr/bin/env node
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'

const projectRoot = new URL('..', import.meta.url).pathname
const localTokenFile = '/home/adobe/.openclaw/workspace/secrets/local/vercel-token-current.txt'

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
    stdio: 'inherit',
    env: { ...process.env, ...(options.env || {}) },
  })
  if (result.status !== 0) process.exit(result.status || 1)
}

function resolveVercelToken() {
  if (process.env.VERCEL_TOKEN) return process.env.VERCEL_TOKEN
  if (fs.existsSync(localTokenFile)) return fs.readFileSync(localTokenFile, 'utf8').trim()
  return ''
}

run('npm', ['run', 'verify:product-schema', '--', '--fail-on-warn'])

const token = resolveVercelToken()
const args = ['--prod', '--yes']
if (token) args.push('--token', token)
else console.warn('[deploy:prod] VERCEL_TOKEN not set and local protected token file not found; falling back to Vercel CLI login state.')

run('vercel', args)
