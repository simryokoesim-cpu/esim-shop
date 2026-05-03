#!/usr/bin/env node
import fs from 'node:fs/promises'
import path from 'node:path'
import playwright from '/home/adobe/simryoko/node_modules/playwright/index.js'

const baseUrl = (process.env.MINIAPP_PROD_URL || 'https://app.simryoko.com').replace(/\/$/, '')
const productId = process.env.CHECKOUT_HEARTBEAT_PRODUCT_ID || '1877'
const outDir = '/home/adobe/.openclaw/workspace/reports/miniapp-checkout-heartbeat'
await fs.mkdir(outDir, { recursive: true })
const startedAt = Date.now()
const result = { ok: false, generatedAt: new Date().toISOString(), baseUrl, productId, steps: [] }
function step(name, ok, extra = {}) { result.steps.push({ name, ok, ...extra }) }

try {
  const health = await fetch(`${baseUrl}/api/health`)
  step('health', health.ok, { status: health.status })
  const products = await fetch(`${baseUrl}/api/products?id=${encodeURIComponent(productId)}&limit=1`)
  const productsBody = await products.json().catch(() => null)
  const product = productsBody?.data?.list?.[0]
  step('product_lookup', products.ok && !!product, { status: products.status, price: product?.price, hasVoice: product?.hasVoice })

  const { chromium } = playwright
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'TelegramBot SimRyokoCheckoutHeartbeat' })
  await page.goto(`${baseUrl}/#/product/${productId}?heartbeat=${Date.now()}`, { waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(1500)
  const requests = []
  page.on('request', request => requests.push({ method: request.method(), url: request.url() }))
  const detailText = await page.evaluate(() => document.body.innerText)
  const buyButtonVisible = /立即购买/.test(detailText)
  step('product_detail_render', /立即购买|套餐规格|USD|流量/.test(detailText), { textSample: detailText.slice(0, 240) })
  step('checkout_entry_available_no_click', buyButtonVisible, { policy: 'Do not click checkout entry because checkout mount creates a pending order; heartbeat must not write orders.' })
  const unsafeOrderWrites = requests.filter(request => request.method !== 'GET' && /\/api\/orders?\b/.test(request.url))
  step('no_order_write_attempt', unsafeOrderWrites.length === 0, { unsafeOrderWrites })
  await browser.close()
  result.ok = result.steps.every(s => s.ok)
} catch (error) {
  result.error = String(error?.stack || error)
}
result.durationMs = Date.now() - startedAt
const report = path.join(outDir, `heartbeat-${new Date().toISOString().replace(/[-:]/g,'').slice(0,13)}.json`)
await fs.writeFile(report, JSON.stringify(result, null, 2))
await fs.writeFile('/home/adobe/.openclaw/workspace/reports/miniapp-checkout-heartbeat-latest.json', JSON.stringify({ ...result, report }, null, 2))
console.log(JSON.stringify({ ...result, report }, null, 2))
if (!result.ok) process.exit(1)
