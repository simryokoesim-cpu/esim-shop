#!/usr/bin/env node
import fs from 'node:fs/promises'
import { spawnSync } from 'node:child_process'
import os from 'node:os'

const reportsDir = '/home/adobe/.openclaw/workspace/reports'
const heartbeatLog = `${reportsDir}/heartbeat.log`
const alertLog = `${reportsDir}/alerts.log`
const baseUrl = 'https://app.simryoko.com'

function diskUsedPercent() {
  const out = spawnSync('df', ['-P', '/home/adobe/.openclaw/workspace'], { encoding: 'utf8' }).stdout.trim().split(/\n/).pop()
  return Number(String(out?.trim().split(/\s+/)[4] || '0').replace('%',''))
}

function cpuLoad() {
  return { load1: os.loadavg()[0], load5: os.loadavg()[1], load15: os.loadavg()[2], cores: os.cpus().length }
}

async function product(id) {
  const res = await fetch(`${baseUrl}/api/products?id=${id}&limit=1&hb=${Date.now()}`)
  const body = await res.json().catch(() => null)
  return { status: res.status, total: body?.data?.total ?? 0, item: body?.data?.list?.[0] || null }
}

async function desktopAlert(message) {
  await fs.appendFile(alertLog, `${new Date().toISOString()} ${message}\n`)
  spawnSync('notify-send', ['SimRyoko ZERO-TOLERANCE', message], { stdio: 'ignore' })
}

await fs.mkdir(reportsDir, { recursive: true })
const load = cpuLoad()
const disk = diskUsedPercent()
await fs.appendFile(heartbeatLog, `${new Date().toISOString()} cpu_load=${load.load1.toFixed(2)}/${load.load5.toFixed(2)}/${load.load15.toFixed(2)} cores=${load.cores} disk_used=${disk}%\n`)

const alerts = []
if (disk > 80) alerts.push(`DISK_GT_80 used=${disk}%`)

const health = await fetch(`${baseUrl}/api/health`).catch(() => null)
if (!health || health.status === 404) alerts.push(`PAYMENT_CHAIN_404 health_status=${health?.status ?? 'FETCH_FAILED'}`)

const p1877 = await product('1877')
const p2643 = await product('2643')
const ok1877 = p1877.status === 200 && p1877.total === 1 && p1877.item?.capability?.voice === true && p1877.item?.capability?.sms === true && p1877.item?.profitAudit?.status === 'PROFITABLE'
const ok2643 = p2643.status === 200 && p2643.total === 0
if (!ok1877) alerts.push(`CONSTITUTION_DRIFT_1877 status=${p1877.status} total=${p1877.total}`)
if (!ok2643) alerts.push(`CONSTITUTION_DRIFT_2643 status=${p2643.status} total=${p2643.total}`)

const vol = JSON.parse(await fs.readFile(`${reportsDir}/miniapp-price-volatility-latest.json`, 'utf8').catch(() => '{}'))
if (vol.ok === false || (vol.violations?.length || 0) > 0) alerts.push(`RRP_VOLATILITY violations=${vol.violations?.length || 0}`)

if (alerts.length) await desktopAlert(alerts.join(' | '))

const state = { ok: alerts.length === 0, generatedAt: new Date().toISOString(), load, diskUsedPercent: disk, checks: { p1877: ok1877, p2643: ok2643, volatilityOk: vol.ok !== false }, alerts }
await fs.writeFile(`${reportsDir}/heartbeat-latest.json`, JSON.stringify(state, null, 2))
console.log(JSON.stringify(state, null, 2))
if (alerts.length) process.exit(2)
