import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import { useOrders, createOrder } from '../hooks/useOrders'
import { formatData, formatDays, formatPrice, getCountryName, USDT_ADDRESS } from '../utils/format'
import { ORDER_STATUS, normalizeOrderStatus } from '../utils/orderStatus'

const COUNTDOWN = 30 * 60 // 30 minutes

const getSettlementInfo = (product, paymentMethod) => {
  const normalizedMethod = String(paymentMethod || 'usdt').toLowerCase()
  const settlementAmount = product?.[`${normalizedMethod}_settlement_amount`]
    ?? product?.[`${normalizedMethod}SettlementAmount`]
    ?? product?.[`${normalizedMethod}_amount`]
    ?? product?.[`${normalizedMethod}Amount`]
    ?? product?.settlement_amount
    ?? product?.settlementAmount
    ?? product?.price
    ?? 0

  const settlementCurrency = product?.[`${normalizedMethod}_settlement_currency`]
    ?? product?.[`${normalizedMethod}SettlementCurrency`]
    ?? product?.[`${normalizedMethod}_currency`]
    ?? product?.[`${normalizedMethod}Currency`]
    ?? product?.settlement_currency
    ?? product?.settlementCurrency
    ?? (normalizedMethod === 'ton' ? 'TON' : 'USDT')

  return {
    amount: Number(settlementAmount) || 0,
    currency: String(settlementCurrency || '').toUpperCase() || (normalizedMethod === 'ton' ? 'TON' : 'USDT'),
  }
}

const formatSettlementDisplay = (amount, currency) => {
  const numericAmount = Number(amount)
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount.toFixed(2) : '0.00'
  return `${safeAmount} ${String(currency || '').toUpperCase()}`.trim()
}

const formatUsdReference = (price) => `${formatPrice(price)} USD`

export default function Checkout() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, loading } = useAllProducts()
  const { addOrder, updateOrder } = useOrders()

  const [order, setOrder] = useState(null)
  const [timeLeft, setTimeLeft] = useState(COUNTDOWN)
  const [copied, setCopied] = useState(false)
  const [orderIdCopied, setOrderIdCopied] = useState(false)
  const [paymentMethod, setPaymentMethod] = useState('usdt')
  const [termsAccepted, setTermsAccepted] = useState(false)
  const intervalRef = useRef(null)
  const orderCreatedRef = useRef(false)

  const product = products.find(p => p.id === parseInt(id))
  const price = product ? formatPrice(product.price) : '0.00'
  const settlement = product ? getSettlementInfo(product, paymentMethod) : { amount: 0, currency: 'USDT' }
  const settlementDisplay = formatSettlementDisplay(settlement.amount, settlement.currency)
  const usdReference = formatUsdReference(price)

  useEffect(() => {
    if (!product) return

    try {
      const tgUserId = window.Telegram?.WebApp?.initDataUnsafe?.user?.id || 'guest'
      const key = `esim_orders_${tgUserId}`
      const existing = JSON.parse(localStorage.getItem(key) || '[]')
      const found = existing.find(o => String(o.productId) === String(product.id) && normalizeOrderStatus(o.status) === ORDER_STATUS.PENDING_PAYMENT)
      if (found) {
        setOrder(found)
        orderCreatedRef.current = true
        return
      }
    } catch(e) {
      console.error('[Checkout] 检查现有订单时出错:', e)
    }

    if (orderCreatedRef.current) return

    orderCreatedRef.current = true
    const newOrder = createOrder(product)
    setOrder(newOrder)
    addOrder(newOrder)
  }, [product]) // eslint-disable-line react-hooks/exhaustive-deps

  const goToOrderDetail = () => {
    if (!termsAccepted) {
      alert('请先阅读并同意服务条款和退款政策')
      return
    }
    if (order) {
      updateOrder(order.id, {
        paymentMethod,
        settlementAmount: settlement.amount,
        settlementCurrency: settlement.currency,
        amount: settlement.amount,
        currency: settlement.currency,
      })
      navigate(`/order/${order.id}`)
    }
  }

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(intervalRef.current)
          return 0
        }
        return t - 1
      })
    }, 1000)
    return () => clearInterval(intervalRef.current)
  }, [])

  const formatTime = (secs) => {
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
  }

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(USDT_ADDRESS)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const el = document.createElement('textarea')
      el.value = USDT_ADDRESS
      document.body.appendChild(el)
      el.select()
      document.execCommand('copy')
      document.body.removeChild(el)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const copyOrderId = async () => {
    if (!order) return
    try {
      await navigator.clipboard.writeText(order.id)
      setOrderIdCopied(true)
      setTimeout(() => setOrderIdCopied(false), 2000)
    } catch {}
  }

  if (loading || !order) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)' }}>加载中...</div>
    </div>
  )

  if (!product) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
      <div style={{ fontSize: '48px' }}>😕</div>
      <div style={{ color: '#fff' }}>套餐不存在</div>
      <button onClick={() => navigate(-1)} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', padding: '10px 24px', cursor: 'pointer' }}>返回</button>
    </div>
  )

  const expired = timeLeft === 0

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', paddingBottom: '30px' }}>
      <div style={{
        padding: '16px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#fff',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            fontSize: '14px',
          }}
        >
          ←
        </button>
        <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>确认订单</span>
      </div>

      <div style={{ padding: '16px' }}>
        <div style={{
          background: 'linear-gradient(135deg, rgba(59,130,246,0.12), rgba(139,92,246,0.12))',
          border: '1px solid rgba(96,165,250,0.2)',
          borderRadius: '20px',
          padding: '16px',
          marginBottom: '16px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              borderRadius: '14px',
              background: 'rgba(59,130,246,0.2)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '26px',
            }}>
              {order.productFlag}
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>
                {getCountryName(product)}
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>
                {formatData(product.dataSize, product.isUnlimited)} · {formatDays(product.validDays)}
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{
                fontSize: '22px',
                fontWeight: 700,
                background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
              }}>
                {settlementDisplay}
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.45)' }}>参考：{usdReference}</div>
            </div>
          </div>
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '14px 16px',
          marginBottom: '16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginBottom: '4px' }}>订单号</div>
            <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', fontFamily: 'monospace' }}>{order.id}</div>
          </div>
          <button
            onClick={copyOrderId}
            style={{
              background: orderIdCopied ? 'rgba(16,185,129,0.2)' : 'rgba(255,255,255,0.07)',
              border: '1px solid ' + (orderIdCopied ? 'rgba(16,185,129,0.4)' : 'rgba(255,255,255,0.1)'),
              borderRadius: '8px',
              color: orderIdCopied ? '#10b981' : 'rgba(255,255,255,0.7)',
              padding: '6px 12px',
              fontSize: '12px',
              cursor: 'pointer',
            }}
          >
            {orderIdCopied ? '✓ 已复制' : '复制'}
          </button>
        </div>

        {!expired ? (
          <div style={{
            background: 'rgba(239,68,68,0.08)',
            border: '1px solid rgba(239,68,68,0.2)',
            borderRadius: '16px',
            padding: '14px 16px',
            marginBottom: '20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.7)', fontSize: '13px' }}>
              <span>⏱️</span>
              <span>请在限时内完成付款</span>
            </div>
            <div style={{
              fontSize: '20px',
              fontWeight: 700,
              color: timeLeft < 300 ? '#ef4444' : '#f97316',
              fontFamily: 'monospace',
              letterSpacing: '1px',
            }}>
              {formatTime(timeLeft)}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(239,68,68,0.12)',
            border: '1px solid rgba(239,68,68,0.3)',
            borderRadius: '16px',
            padding: '16px',
            marginBottom: '20px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '24px', marginBottom: '6px' }}>⌛</div>
            <div style={{ color: '#ef4444', fontWeight: 600, marginBottom: '4px' }}>订单已超时</div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)' }}>请重新下单</div>
          </div>
        )}

        <div style={{ marginBottom: '16px' }}>
          <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>选择支付方式</div>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '16px' }}>
            <button
              onClick={() => setPaymentMethod('usdt')}
              style={{
                flex: 1,
                background: paymentMethod === 'usdt' ? 'linear-gradient(135deg, #26a17b, #1a7a5e)' : 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '12px',
                color: paymentMethod === 'usdt' ? '#fff' : 'rgba(255,255,255,0.6)',
                fontSize: '13px',
                fontWeight: 600,
                padding: '12px',
                cursor: 'pointer',
              }}
            >
              USDT (TRC20)
            </button>
          </div>
        </div>

        {!expired && paymentMethod === 'usdt' && (
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #26a17b, #1a7a5e)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                fontWeight: 700,
                color: '#fff',
              }}>₮</div>
              <div>
                <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>USDT 付款 (TRC20)</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>请按下方结算金额付款</div>
              </div>
            </div>

            <div style={{
              background: 'rgba(59,130,246,0.1)',
              borderRadius: '12px',
              padding: '12px 14px',
              marginBottom: '14px',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>付款金额</span>
                <span style={{ fontSize: '20px', fontWeight: 700, color: '#60a5fa' }}>
                  {settlementDisplay}
                </span>
              </div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>参考：{usdReference}</div>
            </div>

            <div style={{ marginBottom: '14px' }}>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '8px' }}>收款地址</div>
              <div style={{
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '12px',
                padding: '12px',
                fontFamily: 'monospace',
                fontSize: '11px',
                color: 'rgba(255,255,255,0.8)',
                wordBreak: 'break-all',
                lineHeight: 1.6,
              }}>
                {USDT_ADDRESS}
              </div>
            </div>

            <button
              onClick={copyAddress}
              style={{
                width: '100%',
                background: copied ? 'rgba(16,185,129,0.2)' : 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: copied ? '1px solid rgba(16,185,129,0.4)' : 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              {copied ? <>✓ 地址已复制</> : <>📋 复制收款地址</>}
            </button>
          </div>
        )}


        {!expired && (
          <div style={{
            background: 'linear-gradient(135deg, rgba(0,136,204,0.15), rgba(0,136,204,0.08))',
            border: '1px solid rgba(0,136,204,0.3)',
            borderRadius: '20px',
            padding: '20px',
            marginBottom: '16px',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '32px', marginBottom: '10px' }}>🧾</div>
            <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '6px' }}>
              付款后回到订单详情页
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '12px', lineHeight: 1.6 }}>
              系统会自动同步付款与交付状态。<br />
              订单详情页是正式查看二维码、ICCID、安装说明与异常状态的唯一入口。
            </div>
            <label style={{
              display: 'flex', alignItems: 'flex-start', gap: '8px',
              marginBottom: '12px', cursor: 'pointer', textAlign: 'left',
            }}>
              <input
                type="checkbox"
                checked={termsAccepted}
                onChange={e => setTermsAccepted(e.target.checked)}
                style={{ marginTop: '2px', width: '16px', height: '16px', cursor: 'pointer', accentColor: '#0088cc' }}
              />
              <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
                我已阅读并同意{' '}
                <a
                  href="https://simryoko.com/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'underline' }}
                  onClick={e => e.stopPropagation()}
                >服务条款</a>
                {' '}和{' '}
                <a
                  href="https://simryoko.com/refund"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#60a5fa', textDecoration: 'underline' }}
                  onClick={e => e.stopPropagation()}
                >退款政策</a>
              </span>
            </label>

            <button
              onClick={goToOrderDetail}
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #10b981, #059669)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '13px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              📋 已付款？查看订单详情
            </button>
            <div style={{ marginTop: 10, fontSize: 11, color: 'rgba(255,255,255,0.42)', lineHeight: 1.6 }}>
              如自动同步异常，再联系支持处理；支持入口仅用于异常兜底。
            </div>
          </div>
        )}

        <div style={{
          display: 'flex', gap: '8px', marginBottom: '12px', justifyContent: 'center', flexWrap: 'wrap',
        }}>
          {['🔒 加密支付', '⚡ 自动同步订单', '📱 订单页查看交付'].map((t, i) => (
            <span key={i} style={{
              fontSize: '11px', color: 'rgba(255,255,255,0.5)',
              background: 'rgba(255,255,255,0.05)', borderRadius: '20px', padding: '4px 10px',
              border: '1px solid rgba(255,255,255,0.08)',
            }}>{t}</span>
          ))}
        </div>

        <div style={{
          background: 'rgba(255,255,255,0.03)',
          border: '1px solid rgba(255,255,255,0.06)',
          borderRadius: '20px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '14px' }}>
            付款步骤
          </div>
          {[
            { step: '1', text: '复制上方 USDT (TRC20) 收款地址', done: copied },
            { step: '2', text: `按结算金额转账 ${settlementDisplay} 至该地址`, done: false },
            { step: '3', text: `USD 参考金额：${usdReference}`, done: false },
            { step: '4', text: '付款完成后返回订单详情页等待自动同步', done: false },
          ].map((s, i) => (
            <div key={i} style={{
              display: 'flex',
              gap: '12px',
              alignItems: 'flex-start',
              padding: '8px 0',
              borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.04)' : 'none',
            }}>
              <div style={{
                width: '24px',
                height: '24px',
                borderRadius: '50%',
                background: s.done ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.15)',
                border: s.done ? '1px solid rgba(16,185,129,0.4)' : '1px solid rgba(59,130,246,0.3)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '11px',
                fontWeight: 700,
                color: s.done ? '#10b981' : '#60a5fa',
                flexShrink: 0,
              }}>
                {s.done ? '✓' : s.step}
              </div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.65)', lineHeight: 1.5, paddingTop: '2px' }}>
                {s.text}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
