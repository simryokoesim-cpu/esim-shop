// Local order storage (persisted in localStorage by tgUserId)
import { useState, useCallback } from 'react'

const ORDERS_KEY = 'esim_orders'

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

export function useOrders() {
  const [orders, setOrders] = useState(() => loadOrders())

  const addOrder = useCallback((order) => {
    setOrders(prev => {
      const next = [order, ...prev]
      saveOrders(next)
      return next
    })
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
