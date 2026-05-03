#!/usr/bin/env node
import fs from 'node:fs/promises'
import { execSync } from 'node:child_process'

const version = {
  app: 'mini-app',
  generatedAt: new Date().toISOString(),
  gitCommit: execSync('git rev-parse --short HEAD', { encoding: 'utf8' }).trim(),
}

await fs.mkdir('public', { recursive: true })
await fs.writeFile('public/deploy-version.json', JSON.stringify(version, null, 2) + '\n')
console.log(JSON.stringify(version, null, 2))
