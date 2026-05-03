#!/usr/bin/env node
import fs from 'node:fs/promises'
import playwright from '/home/adobe/simryoko/node_modules/playwright/index.js'

const { chromium } = playwright
const idsArg = process.argv.find(a => a.startsWith('--ids='))
const ids = (idsArg?.split('=')[1] || '2643,2644,2645,1877').split(',').filter(Boolean)
const baseUrl = (process.argv.find(a => a.startsWith('--url='))?.split('=').slice(1).join('=') || 'https://app.simryoko.com').replace(/\/$/, '')
const outDir = '/home/adobe/.openclaw/workspace/reports/tg-visual-audit'
await fs.mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })
const results = []
for (const id of ids) {
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, userAgent: 'TelegramBot (like TwitterBot) SimRyokoPredeployAudit' })
  const url = `${baseUrl}/#/product/${id}?audit=${Date.now()}`
  await page.goto(url, { waitUntil: 'networkidle', timeout: 45000 })
  await page.evaluate(() => localStorage.clear())
  await page.reload({ waitUntil: 'networkidle', timeout: 45000 })
  await page.waitForTimeout(3000)
  const text = await page.evaluate(() => document.body.innerText)
  const screenshot = `${outDir}/product-${id}-${Date.now()}.png`
  await page.screenshot({ path: screenshot, fullPage: true })
  const whiteScreen = text.trim().length < 120 || /套餐不存在/.test(text)
  const hasVoice = /含语音|语音通话|通话|Voice/.test(text)
  const hasSms = /短信|SMS/.test(text)
  const hasData = /流量|Data|GB|MB|无限/.test(text)
  results.push({ id, url, screenshot, whiteScreen, hasVoice, hasSms, hasData, textSample: text.slice(0, 600) })
  await page.close()
}
await browser.close()

const ok = results.every(r => !r.whiteScreen && r.hasData) && results.filter(r => ['2643','2644','2645','1877','1878','1879','489','490','491'].includes(String(r.id))).every(r => r.hasVoice && r.hasSms)
const output = { ok, generatedAt: new Date().toISOString(), results }
console.log(JSON.stringify(output, null, 2))
if (!ok) process.exit(1)
