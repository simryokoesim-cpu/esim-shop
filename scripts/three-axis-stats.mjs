#!/usr/bin/env node
import fs from 'node:fs/promises'

const baseUrl = (process.argv.find(arg => arg.startsWith('--url='))?.split('=').slice(1).join('=') || 'https://app.simryoko.com').replace(/\/$/, '')
const outArg = process.argv.find(arg => arg.startsWith('--out='))
const outPath = outArg?.split('=').slice(1).join('=')

function isUnlimited(product) {
  return !!(product.isUnlimited || product.thirdPartyData?.isUnlimited || /无限|unlimited/i.test(`${product.name || ''} ${product.nameEn || ''}`))
}

function capability(product) {
  return {
    data: true,
    voice: !!(product.hasVoice || product.thirdPartyData?.voice || product.capability?.voice),
    sms: !!(product.thirdPartyData?.text || product.capability?.sms),
  }
}

function axis(product) {
  if (product.type === 'global') return 'Global'
  if ((product.countries?.length || 0) === 1) return 'Local'
  if ((product.countries?.length || 0) > 1) return 'Regional'
  return 'Unknown'
}

const products = []
for (let page = 1; page < 1000; page++) {
  const res = await fetch(`${baseUrl}/api/products?page=${page}&limit=100`)
  const body = await res.json()
  const list = body.data?.list || []
  products.push(...list)
  if (!list.length || products.length >= body.data.total) break
}

const stats = {
  generatedAt: new Date().toISOString(),
  source: baseUrl,
  total: products.length,
  axes: {
    Local: { total: 0, Fixed: 0, Unlimited: 0, Data: 0, Voice: 0, SMS: 0 },
    Regional: { total: 0, Fixed: 0, Unlimited: 0, Data: 0, Voice: 0, SMS: 0 },
    Global: { total: 0, Fixed: 0, Unlimited: 0, Data: 0, Voice: 0, SMS: 0 },
    Unknown: { total: 0, Fixed: 0, Unlimited: 0, Data: 0, Voice: 0, SMS: 0 },
  },
  abnormalProductIds: [],
}

for (const product of products) {
  const a = axis(product)
  const bucket = stats.axes[a]
  bucket.total += 1
  bucket[isUnlimited(product) ? 'Unlimited' : 'Fixed'] += 1
  const cap = capability(product)
  if (cap.data) bucket.Data += 1
  if (cap.voice) bucket.Voice += 1
  if (cap.sms) bucket.SMS += 1
  if (String(product.description || '').includes('Voice/SMS features not supported')) stats.abnormalProductIds.push(product.id)
}

const markdown = `# MiniApp 三轴分类分布统计\n\nGenerated: ${stats.generatedAt}\nSource: ${stats.source}\nTotal products: ${stats.total}\n\n| Axis | Total | Fixed | Unlimited | Data | Voice | SMS |\n|---|---:|---:|---:|---:|---:|---:|\n${Object.entries(stats.axes).map(([name, row]) => `| ${name} | ${row.total} | ${row.Fixed} | ${row.Unlimited} | ${row.Data} | ${row.Voice} | ${row.SMS} |`).join('\n')}\n\nAbnormal products corrected with Data Only note: ${stats.abnormalProductIds.length}\nIDs: ${stats.abnormalProductIds.join(', ') || 'none'}\n`

console.log(JSON.stringify(stats, null, 2))
if (outPath) {
  await fs.writeFile(outPath.replace(/\.json$/, '.json'), JSON.stringify(stats, null, 2) + '\n')
  await fs.writeFile(outPath.replace(/\.json$/, '.md'), markdown)
}
