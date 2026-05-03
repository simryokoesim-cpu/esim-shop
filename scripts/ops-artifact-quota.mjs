#!/usr/bin/env node
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import { spawnSync } from 'node:child_process'

const args = new Set(process.argv.slice(2))
const dryRun = args.has('--dry-run')
const force = args.has('--force')
const now = Date.now()
const maxAgeMs = Number(process.env.OPS_ARTIFACT_MAX_AGE_DAYS || 3) * 24 * 60 * 60 * 1000
const roots = [
  '/home/adobe/.openclaw/workspace/reports/tg-visual-audit',
  '/home/adobe/.openclaw/workspace/reports/browser-smoke',
  '/home/adobe/.openclaw/workspace/reports/reality-check-20260503-130308',
  '/home/adobe/.openclaw/workspace/reports/reality-check-after-coldbuild-20260503-130836',
  '/home/adobe/.openclaw/workspace/runtime/esim-shop/logs',
]
const exts = new Set(['.log','.png','.jpg','.jpeg','.webp','.txt'])

function diskUsedPercent() {
  const out = spawnSync('df', ['-P', '/home/adobe/.openclaw/workspace'], { encoding: 'utf8' }).stdout.trim().split(/\n/).pop()
  const parts = out.trim().split(/\s+/)
  return Number(String(parts[4] || '0').replace('%',''))
}

async function walk(dir, files = []) {
  if (!fsSync.existsSync(dir)) return files
  for (const ent of await fs.readdir(dir, { withFileTypes: true })) {
    const p = path.join(dir, ent.name)
    if (ent.isDirectory()) await walk(p, files)
    else files.push(p)
  }
  return files
}

const used = diskUsedPercent()
const shouldClean = force || used >= 80
const candidates = []
for (const root of roots) {
  for (const file of await walk(root)) {
    const ext = path.extname(file).toLowerCase()
    if (!exts.has(ext)) continue
    const st = await fs.stat(file)
    if (shouldClean || now - st.mtimeMs > maxAgeMs) candidates.push({ file, bytes: st.size, ageDays: Number(((now - st.mtimeMs)/(24*60*60*1000)).toFixed(2)) })
  }
}
let deletedBytes = 0
for (const item of candidates) {
  deletedBytes += item.bytes
  if (!dryRun) await fs.rm(item.file, { force: true })
}
const result = { ok: true, generatedAt: new Date().toISOString(), diskUsedPercent: used, thresholdUsedPercent: 80, force, dryRun, deletedCount: candidates.length, deletedBytes, candidates: candidates.slice(0, 200) }
await fs.mkdir('/home/adobe/.openclaw/workspace/reports', { recursive: true })
await fs.writeFile('/home/adobe/.openclaw/workspace/reports/miniapp-artifact-quota-latest.json', JSON.stringify(result, null, 2))
console.log(JSON.stringify(result, null, 2))
