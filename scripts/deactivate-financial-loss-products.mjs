#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js'
import { summarizeProfit } from './financial-utils.mjs'
import { loadProductsSource } from './load-products-source.mjs'

const baseUrl = (process.argv.find(arg => arg.startsWith('--url='))?.split('=').slice(1).join('=') || 'https://app.simryoko.com').replace(/\/$/, '')
const dryRun = process.argv.includes('--dry-run')
const supabaseUrl = process.env.SUPABASE_URL || 'https://afdyzuohzwdvreyhnfdb.supabase.co'
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY
if (!supabaseKey) throw new Error('Missing SUPABASE_SERVICE_KEY/SUPABASE_SERVICE_ROLE_KEY')

const loaded = await loadProductsSource({ baseUrl, includeFinancialLoss: true })
const products = loaded.products

const report = summarizeProfit(products)
const ids = report.financialLoss.map(p => p.id)
const supabase = createClient(supabaseUrl, supabaseKey)
let updateResult = { updated: 0, matched: 0, dryRun }

if (ids.length) {
  const { data: matched, error: matchError } = await supabase
    .from('miniapp_products')
    .select('id,is_active')
    .in('id', ids)
  if (matchError) throw matchError
  updateResult.matched = matched?.length || 0

  if (!dryRun && updateResult.matched > 0) {
    const { data, error } = await supabase
      .from('miniapp_products')
      .update({ is_active: false, updated_at: new Date().toISOString() })
      .in('id', ids)
      .select('id,is_active')
    if (error) throw error
    updateResult.updated = data?.length || 0
  }
}

console.log(JSON.stringify({
  ok: true,
  source: loaded.source,
  financialLossCount: report.financialLossCount,
  lowMarginCount: report.lowMarginCount,
  ids,
  supabase: updateResult,
}, null, 2))
