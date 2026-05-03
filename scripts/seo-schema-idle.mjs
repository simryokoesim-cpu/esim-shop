#!/usr/bin/env node
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import os from 'node:os'
import crypto from 'node:crypto'
import { loadProductsSource } from './load-products-source.mjs'
import { generateProductJsonLd } from './skill-seo.js'

const outDir = path.join(new URL('..', import.meta.url).pathname, 'data/seo-schema')
const statePath = path.join(outDir, 'state.json')
const maxBatch = Number(process.env.SEO_SCHEMA_BATCH_SIZE || 80)
const cpuLimit = Number(process.env.SEO_SCHEMA_CPU_LIMIT || 70)
const now = new Date()
const hour = now.getUTCHours()
function cpuUsedPercent() {
  const load = os.loadavg()[0]
  const cores = Math.max(1, os.cpus().length)
  return Math.round((load / cores) * 1000) / 10
}
function hashProduct(p) { return crypto.createHash('sha256').update(JSON.stringify({ id:p.id, price:p.price, name:p.name, nameEn:p.nameEn, features:p.features, capability:p.capability, countries:p.countries })).digest('hex') }
async function readState() { try { return JSON.parse(await fs.readFile(statePath,'utf8')) } catch { return { cursor: 0, hashes: {} } } }

const cpu = cpuUsedPercent()
const result = { ok: true, generatedAt: now.toISOString(), utcHour: hour, cpuUsedPercent: cpu, window: 'UTC 02:00-06:00', processed: 0, skipped: 0, reason: null }
if (hour < 2 || hour >= 6) { result.reason = 'OUTSIDE_IDLE_WINDOW'; console.log(JSON.stringify(result,null,2)); process.exit(0) }
if (cpu > cpuLimit) { result.reason = 'CPU_BUSY_HOLD'; console.log(JSON.stringify(result,null,2)); process.exit(0) }

await fs.mkdir(outDir, { recursive: true })
const state = await readState()
const loaded = await loadProductsSource({ includeFinancialLoss: false })
const products = loaded.products.sort((a,b)=>String(a.id).localeCompare(String(b.id), undefined, { numeric:true }))
let cursor = Math.min(state.cursor || 0, products.length)
for (let i=0; i<products.length && result.processed<maxBatch; i++) {
  const idx = (cursor + i) % products.length
  const p = products[idx]
  const id = String(p.id)
  const h = hashProduct(p)
  if (state.hashes[id] === h && fsSync.existsSync(path.join(outDir, `${id}.json`))) { result.skipped++; continue }
  await fs.writeFile(path.join(outDir, `${id}.json`), JSON.stringify(generateProductJsonLd(p), null, 2))
  state.hashes[id] = h
  result.processed++
  cursor = (idx + 1) % products.length
}
state.cursor = cursor
state.updatedAt = result.generatedAt
state.source = loaded.source
await fs.writeFile(statePath, JSON.stringify(state, null, 2))
console.log(JSON.stringify(result, null, 2))
