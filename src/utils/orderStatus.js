const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

const ORDER_STATUS = {
  PENDING_PAYMENT: 'pending_payment',
  PAYMENT_REVIEW: 'payment_review',
  PAID: 'paid',
  PROCESSING: 'processing',
  DELIVERED: 'delivered',
  ACTIVATED: 'activated',
  FAILED: 'failed',
}

const looksLikeTrustworthyQr = (value) => {
  if (!isNonEmptyString(value)) return false
  const normalized = value.trim()
  if (normalized.length < 12) return false
  return /LPA:1\$/i.test(normalized) || /^1\$[^$]+\$[^$]+$/i.test(normalized) || /^https?:\/\//i.test(normalized)
}

const hasTrustedDeliveryPayload = (order) => {
  const hasValidQr = looksLikeTrustworthyQr(order?.esimQrCode ?? order?.esim_qr_code)
  const hasIccid = isNonEmptyString(order?.esimIccid ?? order?.esim_iccid)
  return { hasValidQr, hasIccid, isComplete: hasValidQr && hasIccid }
}

const normalizeOrderStatus = (orderOrStatus) => {
  const raw = String(typeof orderOrStatus === 'string' ? orderOrStatus : orderOrStatus?.status || 'pending_payment').toLowerCase()
  const isComplete = typeof orderOrStatus === 'object' && orderOrStatus ? hasTrustedDeliveryPayload(orderOrStatus).isComplete : false
  if (raw === 'pending' || raw === 'pending_payment') return ORDER_STATUS.PENDING_PAYMENT
  if (raw === 'payment_review') return ORDER_STATUS.PAYMENT_REVIEW
  if (raw === 'paid') return ORDER_STATUS.PAID
  if (raw === 'processing' || raw === 'activating') return ORDER_STATUS.PROCESSING
  if (raw === 'delivered') return isComplete ? ORDER_STATUS.DELIVERED : ORDER_STATUS.PROCESSING
  if (raw === 'activated' || raw === 'active') return ORDER_STATUS.ACTIVATED
  if (raw === 'failed' || raw === 'activation_failed' || raw === 'delivery_failed') return ORDER_STATUS.FAILED
  if (raw === 'cancelled') return 'cancelled'
  return ORDER_STATUS.PENDING_PAYMENT
}

const userStatusConfig = {
  pending_payment: { label: '待付款', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⏳', title: '等待付款', desc: '请按页面指引完成转账，系统会自动同步付款状态' },
  payment_review: { label: '审核中', color: '#f97316', bg: 'rgba(249,115,22,0.12)', icon: '🧾', title: '付款审核中', desc: '系统正在核对付款状态，请在订单详情页等待同步结果' },
  paid: { label: '已确认付款', color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', icon: '💳', title: '已确认付款', desc: '付款已确认，准备交付' },
  processing: { label: '处理中', color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', icon: '🛰️', title: '交付处理中', desc: '供应商已受理，正在等待完整 eSIM 信息' },
  delivered: { label: '已发货', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '✅', title: '已发货', desc: '您的 eSIM 已准备好，请扫码激活' },
  activated: { label: '已激活', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟢', title: '已激活', desc: 'eSIM 已激活' },
  failed: { label: '处理失败', color: '#ef4444', bg: 'rgba(239,68,68,0.12)', icon: '❌', title: '处理失败', desc: '请联系客服处理' },
  cancelled: { label: '已取消', color: 'rgba(255,255,255,0.35)', bg: 'rgba(255,255,255,0.05)', icon: '✗', title: '已取消', desc: '订单已取消' },
}

const getStatusConfig = (status) => userStatusConfig[normalizeOrderStatus(status)] || userStatusConfig.pending_payment
const formatOrderAmount = (amount, currency = 'USD') => `${String(currency).toUpperCase()} ${Number.parseFloat(amount || 0).toFixed(2)}`
const formatPaymentMethodLabel = (method = 'usdt') => String(method).toLowerCase() === 'ton' ? 'TON' : 'USDT (TRC20)'

export { ORDER_STATUS, looksLikeTrustworthyQr, hasTrustedDeliveryPayload, normalizeOrderStatus, userStatusConfig, getStatusConfig, formatOrderAmount, formatPaymentMethodLabel }
