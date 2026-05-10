#!/usr/bin/env node
import fs from 'node:fs/promises'
import fsSync from 'node:fs'
import path from 'node:path'

async function readJson(file) { try { return JSON.parse(await fs.readFile(file,'utf8')) } catch { return null } }
const reportsDir = '/home/adobe/.openclaw/workspace/reports'
const verify = await readJson('/home/adobe/.openclaw/workspace/reports/miniapp-profit-audit-predeploy-latest.json')
const volatility = await readJson('/home/adobe/.openclaw/workspace/reports/miniapp-price-volatility-latest.json')
const heartbeat = await readJson('/home/adobe/.openclaw/workspace/reports/miniapp-checkout-heartbeat-latest.json')
const disk = await readJson('/home/adobe/.openclaw/workspace/reports/miniapp-artifact-quota-latest.json')
const lines = [
  '# SimRyoko 自动运营简报',
  '',
  `Generated: ${new Date().toISOString()}`,
  '',
  '## Silent Operator Signals',
  `- Price volatility: ${volatility ? (volatility.ok ? 'OK' : 'ALERT') : 'NO_DATA'}${volatility ? ` (violations=${volatility.violations?.length || 0})` : ''}`,
  `- Checkout heartbeat: ${heartbeat ? (heartbeat.ok ? 'OK' : 'ALERT') : 'NO_DATA'}${heartbeat ? ` (${heartbeat.generatedAt})` : ''}`,
  `- Disk quota: ${disk ? `${disk.diskUsedPercent}% used, deleted=${disk.deletedCount}` : 'NO_DATA'}`,
  `- Profit audit: ${verify ? `lossBlocked=${verify.financialLossCount ?? verify.financial?.financialLossBlocked ?? 'n/a'}, lowMargin=${verify.lowMarginCount ?? verify.financial?.lowMarginWarnings ?? 'n/a'}` : 'NO_DATA'}`,
  '',
  '## Notes',
  '- 默认静默；仅亏损拦截、价格波动熔断、宿体风险需要即时打扰。',
]
const outDir = path.join(reportsDir, 'weekly-ops-brief')
await fs.mkdir(outDir, { recursive: true })
const out = path.join(outDir, `brief-${new Date().toISOString().slice(0,10)}.md`)
await fs.writeFile(out, lines.join('\n'))
console.log(out)
