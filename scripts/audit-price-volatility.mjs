#!/usr/bin/env node
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import { loadProductsSource } from './load-products-source.mjs'
import { getRetailPrice } from './skill-audit.js'

const args = new Set(process.argv.slice(2))
const root = new URL('..', import.meta.url).pathname
const baselinePath = path.join(root, 'data/price-baseline.json')
const reportPath = '/home/adobe/.openclaw/workspace/reports/miniapp-price-volatility-latest.json'
const threshold = Number(process.env.PRICE_VOLATILITY_THRESHOLD || 0.5)

function digest(rows) {
  return crypto.createHash('sha256').update(JSON.stringify(rows)).digest('hex')
}

function rowFrom(product) {
  return {
    id: String(product.id),
    name: product.name || product.nameEn || '',
    price: getRetailPrice(product),
    updatedAt: product.updatedAt || product.updated_at || null,
  }
}

async function readBaseline() {
  try { return JSON.parse(await fs.readFile(baselinePath, 'utf8')) } catch { return null }
}

const loaded = await loadProductsSource({ includeFinancialLoss: true })
const currentRows = loaded.products.map(rowFrom).filter(row => row.id && Number.isFinite(row.price) && row.price > 0).sort((a,b)=>a.id.localeCompare(b.id, undefined, { numeric: true }))
const currentHash = digest(currentRows.map(({id, price}) => [id, price]))
const baseline = await readBaseline()
const previousById = new Map((baseline?.products || []).map(row => [String(row.id), row]))
const violations = []
const warnings = []

if (baseline?.products?.length) {
  for (const row of currentRows) {
    const prev = previousById.get(row.id)
    if (!prev || !Number.isFinite(Number(prev.price)) || Number(prev.price) <= 0) continue
    const previousPrice = Number(prev.price)
    const deltaRatio = (row.price - previousPrice) / previousPrice
    if (Math.abs(deltaRatio) > threshold) {
      violations.push({ id: row.id, name: row.name, previousPrice, currentPrice: row.price, deltaRatio: Number(deltaRatio.toFixed(4)), code: 'PRICE_VOLATILITY_DIRTY_DATA' })
    }
  }
  const currentIds = new Set(currentRows.map(row => row.id))
  for (const prev of baseline.products || []) {
    if (!currentIds.has(String(prev.id))) warnings.push({ id: String(prev.id), previousPrice: Number(prev.price), code: 'PRODUCT_MISSING_FROM_CURRENT_FEED' })
  }
}

const report = {
  ok: violations.length === 0,
  generatedAt: new Date().toISOString(),
  source: loaded.source,
  threshold,
  baselineGeneratedAt: baseline?.generatedAt || null,
  previousHash: baseline?.hash || null,
  currentHash,
  changed: baseline?.hash !== currentHash,
  total: currentRows.length,
  violations,
  warnings: warnings.slice(0, 100),
}

await fs.mkdir(path.dirname(reportPath), { recursive: true })
await fs.writeFile(reportPath, JSON.stringify(report, null, 2))
console.log(JSON.stringify(report, null, 2))

if (violations.length) process.exit(2)

if (args.has('--write')) {
  if (!baseline || baseline.hash !== currentHash) {
    await fs.mkdir(path.dirname(baselinePath), { recursive: true })
    await fs.writeFile(baselinePath, JSON.stringify({ generatedAt: report.generatedAt, source: loaded.source, hash: currentHash, products: currentRows }, null, 2))
  }
}
