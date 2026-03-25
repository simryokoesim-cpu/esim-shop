// Local order storage (persisted in localStorage by tgUserId) + Supabase sync
import { useState, useCallback } from 'react'
import { createClient } from '@supabase/supabase-js'

const ORDERS_KEY = 'esim_orders'

// Supabase client (anon key – read-only for orders, write on insert)
const supabase = createClient(
  'https://afdyzuohzwdvreyhnfdb.supabase.co',
  'sb_publishable_FfMQeSJTbZPfsKtMF6nyqA_Fgo_gzun'
)

function getTgUserId() {
  try {
    return window.Telegram?.WebApp?.initDataUnsafe?.user?.id?.toString() || 'guest'
  } catch {
    return 'guest'
  }
}

function loadOrders() {
  try {
    const key = `${ORDERS_KEY}_${getTgUserId()}`
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveOrders(orders) {
  try {
    const key = `${ORDERS_KEY}_${getTgUserId()}`
    localStorage.setItem(key, JSON.stringify(orders))
  } catch {}
}

// Get referral code from URL params or Telegram WebApp start_param
function getReferralCode() {
  try {
    // 1. 从 URL 参数获取 (?ref=REF_XXXXXX)
    const urlParams = new URLSearchParams(window.location.search)
    const urlRef = urlParams.get('ref')
    if (urlRef) {
      localStorage.setItem('esim_ref', urlRef)
      return urlRef
    }
    // 2. 从 Telegram WebApp start_param 获取 (start=ref_REF_XXXXXX)
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param
    if (startParam && startParam.startsWith('ref_')) {
      const code = startParam.replace('ref_', '')
      localStorage.setItem('esim_ref', code)
      return code
    }
    // 3. 从 localStorage 恢复（防止页面刷新丢失）
    return localStorage.getItem('esim_ref') || null
  } catch {
    return null
  }
}

// Save order to Supabase - 重试3次确保写入
async function saveOrderToSupabase(order, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
      const refCode = getReferralCode()
      const payload = {
        id: order.id,
        tg_id: tgUser?.id?.toString() || order.tgUserId || 'guest',
        tg_username: tgUser?.username || order.tgUsername || 'unknown',
        product_id: String(order.productId),
        product_name: order.productName,
        amount: String(order.price),
        currency: 'USDT',
        status: 'pending',
        created_at: new Date().toISOString(),
        referral_code: refCode || null,
      }
      const { error } = await supabase.from('miniapp_orders').upsert(payload, { onConflict: 'id' })
      if (error) {
        console.warn(`[useOrders] Supabase save attempt ${i+1} failed:`, error.message)
        if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
      } else {
        console.log('[useOrders] ✅ 订单已写入 Supabase:', order.id)
        return
      }
    } catch (e) {
      console.warn(`[useOrders] Supabase save exception ${i+1}:`, e.message)
      if (i < retries - 1) await new Promise(r => setTimeout(r, 1000))
    }
  }
  console.error('[useOrders] ❌ 订单写入 Supabase 失败（已重试3次）:', order.id)
}

export function useOrders() {
  const [orders, setOrders] = useState(() => loadOrders())

  const addOrder = useCallback((order) => {
    setOrders(prev => {
      const next = [order, ...prev]
      saveOrders(next)
      return next
    })
    // Async save to Supabase (non-blocking)
    saveOrderToSupabase(order)
  }, [])

  const updateOrder = useCallback((orderId, updates) => {
    setOrders(prev => {
      const next = prev.map(o => o.id === orderId ? { ...o, ...updates } : o)
      saveOrders(next)
      return next
    })
  }, [])

  const cancelOrder = useCallback((orderId) => {
    setOrders(prev => {
      const next = prev.map(o => o.id === orderId ? { ...o, status: 'cancelled' } : o)
      saveOrders(next)
      return next
    })
  }, [])

  return { orders, addOrder, updateOrder, cancelOrder }
}

export function createOrder(product) {
  const id = 'ESM' + Date.now().toString(36).toUpperCase() + Math.random().toString(36).slice(2, 5).toUpperCase()
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  return {
    id,
    productId: product.id,
    productName: product.name,
    productFlag: getProductFlag(product),
    dataLabel: formatDataLabel(product),
    daysLabel: `${product.validDays}天`,
    price: product.agentPrice || product.price,
    status: 'pending',
    createdAt: new Date().toISOString().split('T')[0],
    activatedAt: null,
    expiresAt: null,
    tgUserId: tgUser?.id?.toString() || null,
    tgUsername: tgUser?.username || null,
  }
}

function getProductFlag(product) {
  if (!product.countries || product.countries.length === 0) return '🌐'
  if (product.type === 'global') return '🌐'
  const code = product.countries[0]?.code
  if (!code) return '🌐'
  // Convert country code to flag emoji
  return code.toUpperCase().split('').map(c => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')
}

function formatDataLabel(product) {
  if (product.thirdPartyData?.isUnlimited || product.dataSize === 0) return '无限流量'
  if (!product.dataSize) return '未知'
  const gb = product.dataSize / 1024
  if (gb < 1) return `${product.dataSize}MB`
  return Number.isInteger(gb) ? `${gb}GB` : `${gb.toFixed(1)}GB`
}
