#!/usr/bin/env node
import fs from 'node:fs/promises'
import playwright from '/home/adobe/simryoko/node_modules/playwright/index.js'

const { chromium } = playwright
const idsArg = process.argv.find(a => a.startsWith('--ids='))
const ids = (idsArg?.split('=')[1] || '2643,2644,2645,1877').split(',').filter(Boolean)
const baseUrl = (process.argv.find(a => a.startsWith('--url='))?.split('=').slice(1).join('=') || process.argv.find(a => a.startsWith('--base='))?.split('=').slice(1).join('=') || 'https://app.simryoko.com').replace(/\/$/, '')
const outDir = '/home/adobe/.openclaw/workspace/reports/tg-visual-audit'
await fs.mkdir(outDir, { recursive: true })

async function productApiState(id) {
  const res = await fetch(`${baseUrl}/api/products?id=${encodeURIComponent(id)}&limit=1&audit=${Date.now()}`)
  const body = await res.json().catch(() => null)
  const product = body?.data?.list?.[0] || null
  return { status: res.status, total: body?.data?.total ?? 0, product }
}

const browser = await chromium.launch({ headless: true })
const results = []
for (const id of ids) {
  const api = await productApiState(id)
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'TelegramBot (like TwitterBot) SimRyokoPredeployAudit' })
  const url = `${baseUrl}/#/product/${id}?audit=${Date.now()}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(3000)
  const text = await page.evaluate(() => document.body.innerText)
  const screenshot = `${outDir}/product-${id}-${Date.now()}.png`
  await page.screenshot({ path: screenshot, fullPage: true })
  const hidden = api.total === 0 || !api.product
  const whiteScreen = text.trim().length < 120 || (/套餐不存在/.test(text) && !hidden)
  const hasVoice = /含语音|语音通话|通话|Voice/.test(text)
  const hasSms = /短信|SMS/.test(text)
  const hasData = /流量|Data|GB|MB|无限/.test(text)
  const expectedVoiceSms = !!(api.product?.capability?.voice || api.product?.capability?.sms || api.product?.hasVoice)
  const ok = hidden
    ? /套餐不存在/.test(text)
    : (!whiteScreen && hasData && (!expectedVoiceSms || (hasVoice && hasSms)))
  results.push({ id, ok, url, api: { status: api.status, total: api.total, price: api.product?.price, agentPrice: api.product?.agentPrice, capability: api.product?.capability, profitAudit: api.product?.profitAudit }, screenshot, hidden, whiteScreen, hasVoice, hasSms, hasData, expectedVoiceSms, textSample: text.slice(0, 600) })
  await page.close()
}
await browser.close()

const ok = results.every(r => r.ok)
const output = { ok, generatedAt: new Date().toISOString(), baseUrl, results }
console.log(JSON.stringify(output, null, 2))
if (!ok) process.exit(1)
