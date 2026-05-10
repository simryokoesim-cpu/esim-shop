#!/usr/bin/env node
import fs from 'node:fs/promises'
import { summarizeProfit } from './financial-utils.mjs'
import { loadProductsSource } from './load-products-source.mjs'

const baseUrl = (process.argv.find(arg => arg.startsWith('--url='))?.split('=').slice(1).join('=') || 'https://app.simryoko.com').replace(/\/$/, '')
const outArg = process.argv.find(arg => arg.startsWith('--out='))
const outPath = outArg?.split('=').slice(1).join('=')

const loaded = await loadProductsSource({ baseUrl, includeFinancialLoss: true })
const products = loaded.products

const report = {
  generatedAt: new Date().toISOString(),
  source: loaded.source,
  note: 'Currency: USD. Margin = RRP price - agentPrice. No dynamic/AI repricing; financial-loss products must be blocked as DATA_ERROR.',
  ...summarizeProfit(products),
}

const markdown = `# MiniApp 盈利能力对账报告\n\nGenerated: ${report.generatedAt}\nSource: ${report.source}\n${report.note}\n\n- 在线盈利产品总数: ${report.profitableCount}\n- 亏损拦截/下架总数: ${report.financialLossCount}\n- LOW_MARGIN 预警总数: ${report.lowMarginCount}\n- 缺成本字段总数: ${report.missingCostCount}\n\n## Top 10 亏损黑名单\n\n| ID | 国家 | 产品 | 售价 USD | 批发 USD | 倒挂 USD |\n|---:|---|---|---:|---:|---:|\n${report.topLossBlacklist.map(p => `| ${p.id} | ${p.country} | ${p.name} | ${p.priceUsd} | ${p.wholesaleCostUsd} | ${p.marginUsd} |`).join('\n') || '| - | - | - | - | - | - |'}\n\n## LOW_MARGIN 产品\n\n| ID | 国家 | 产品 | 售价 USD | 批发 USD | 毛利 USD |\n|---:|---|---|---:|---:|---:|\n${report.lowMargin.map(p => `| ${p.id} | ${p.country} | ${p.name} | ${p.priceUsd} | ${p.wholesaleCostUsd} | ${p.marginUsd} |`).join('\n') || '| - | - | - | - | - | - |'}\n`

console.log(JSON.stringify(report, null, 2))
if (outPath) {
  await fs.writeFile(outPath.replace(/\.json$/, '.json'), JSON.stringify(report, null, 2) + '\n')
  await fs.writeFile(outPath.replace(/\.json$/, '.md'), markdown)
}
