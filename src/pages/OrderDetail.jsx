import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { ORDER_STATUS, formatOrderAmount, getStatusConfig, hasTrustedDeliveryPayload, looksLikeTrustworthyQr, normalizeOrderStatus } from '../utils/orderStatus'

const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0

function copyText(value) {
  if (!value) return
  if (navigator.clipboard?.writeText) {
    navigator.clipboard.writeText(value).catch(() => {})
    return
  }
  const el = document.createElement('textarea')
  el.value = value
  document.body.appendChild(el)
  el.select()
  document.execCommand('copy')
  document.body.removeChild(el)
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { orders, updateOrder } = useOrders()
  const [dbOrder, setDbOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)
  const localOrder = orders.find(o => o.id === orderId)

  async function fetchFromDB() {
    try {
      const initData = window.Telegram?.WebApp?.initData || ''
      const res = await fetch(`/api/orders?id=${encodeURIComponent(orderId)}`, {
        headers: { 'X-Telegram-Init-Data': initData }
      })

      if (res.status === 403) {
        const fallback = { id: orderId, status: ORDER_STATUS.FAILED, errorCode: 'permission_mismatch' }
        setDbOrder(fallback)
        return fallback
      }

      const data = await res.json()
      if (Array.isArray(data) && data[0]) {
        setDbOrder(data[0])
        if (localOrder) {
          updateOrder(orderId, {
            status: data[0].status,
            esimIccid: data[0].esim_iccid,
            esimQrCode: data[0].esim_qr_code,
            amount: data[0].amount ?? localOrder.amount,
            currency: data[0].currency || localOrder.currency,
            paymentMethod: localOrder.paymentMethod || data[0].payment_method,
            settlementAmount: localOrder.settlementAmount ?? data[0].settlement_amount,
            settlementCurrency: localOrder.settlementCurrency || data[0].settlement_currency,
          })
        }
        return data[0]
      }
    } catch (e) {
      console.error('[OrderDetail] fetchFromDB error:', e)
    }
    return null
  }

  useEffect(() => {
    setLoading(true)
    fetchFromDB().then(() => setLoading(false))

    pollRef.current = setInterval(async () => {
      const latestOrder = await fetchFromDB()
      const currentStatus = normalizeOrderStatus(latestOrder)
      const { isComplete } = hasTrustedDeliveryPayload(latestOrder)
      const canStopPolling = currentStatus === ORDER_STATUS.FAILED
        || currentStatus === ORDER_STATUS.ACTIVATED
        || (currentStatus === ORDER_STATUS.DELIVERED && isComplete)

      if (canStopPolling && pollRef.current) clearInterval(pollRef.current)
    }, 10000)

    return () => {
      if (pollRef.current) clearInterval(pollRef.current)
    }
  }, [orderId]) // eslint-disable-line react-hooks/exhaustive-deps

  const order = dbOrder
    ? {
        id: dbOrder.id,
        productName: dbOrder.product_name || localOrder?.productName,
        amount: dbOrder.amount || localOrder?.amount || localOrder?.price,
        currency: dbOrder.currency || localOrder?.currency || 'USD',
        paymentMethod: localOrder?.paymentMethod || dbOrder.payment_method,
        settlementAmount: localOrder?.settlementAmount ?? dbOrder.settlement_amount,
        settlementCurrency: localOrder?.settlementCurrency || dbOrder.settlement_currency,
        status: dbOrder.status,
        esimIccid: dbOrder.esim_iccid,
        esimQrCode: dbOrder.esim_qr_code,
        createdAt: dbOrder.created_at || localOrder?.createdAt,
        errorCode: dbOrder.errorCode,
      }
    : localOrder
      ? { ...localOrder, amount: localOrder.amount ?? localOrder.price, currency: localOrder.currency || 'USD' }
      : null

  if (loading && !order) {
    return <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>加载中...</div></div>
  }

  if (!order) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12, padding: 20 }}>
        <div style={{ fontSize: 48 }}>😕</div>
        <div style={{ color: '#fff', fontWeight: 600 }}>找不到这个订单</div>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, textAlign: 'center', lineHeight: 1.6 }}>链接可能已失效、订单不属于当前 Telegram 账号，或订单尚未成功保存。</div>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={() => navigate('/orders')} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', padding: '10px 24px', cursor: 'pointer' }}>返回我的订单</button>
          <button onClick={() => window.open('https://t.me/Esim_sale1_bot', '_blank')} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: '#fff', padding: '10px 24px', cursor: 'pointer' }}>联系支持</button>
        </div>
      </div>
    )
  }

  const rawStatus = String(order.status || ORDER_STATUS.PENDING_PAYMENT).toLowerCase()
  const userStatus = normalizeOrderStatus(order)
  const st = getStatusConfig(order)
  const { hasValidQr, hasIccid, isComplete } = hasTrustedDeliveryPayload(order)
  const activationCode = looksLikeTrustworthyQr(order.esimQrCode) ? order.esimQrCode.trim() : ''
  const showDeliveryCenter = userStatus === ORDER_STATUS.DELIVERED || userStatus === ORDER_STATUS.ACTIVATED
  const showInstallationPlaceholder = userStatus === ORDER_STATUS.PROCESSING
  const showManualActivation = isNonEmptyString(activationCode)
  const showMissingDeliveryWarning = rawStatus === ORDER_STATUS.DELIVERED && !isComplete
  const supportMessage = encodeURIComponent(`order_${order.id}_${userStatus}`)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', paddingBottom: 30 }}>
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/orders')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>订单详情</span>
      </div>

      <div style={{ padding: 16 }}>
        <div style={{ background: `rgba(${st.color === '#10b981' ? '16,185,129' : st.color === '#f59e0b' ? '245,158,11' : st.color === '#8b5cf6' ? '139,92,246' : st.color === '#f97316' ? '249,115,22' : '239,68,68'},0.1)`, border: `1px solid ${st.color}40`, borderRadius: 20, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{st.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: st.color, marginBottom: 4 }}>{st.title}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.58)' }}>{st.desc}</div>
          {(userStatus === ORDER_STATUS.PROCESSING || userStatus === ORDER_STATUS.PENDING_PAYMENT || userStatus === ORDER_STATUS.PAYMENT_REVIEW) && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: st.color, animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                {userStatus === ORDER_STATUS.PROCESSING
                  ? '系统会继续自动刷新交付状态'
                  : userStatus === ORDER_STATUS.PAYMENT_REVIEW
                    ? '付款已提交，等待审核通过后自动进入处理'
                    : '完成付款后请回到本页等待自动同步'}
              </span>
            </div>
          )}
        </div>

        {showMissingDeliveryWarning && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#f59e0b', marginBottom: 6 }}>交付数据仍在同步</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>供应商记录显示已发货，但二维码或 ICCID 仍不完整。当前订单会继续按“处理中”展示，直到正式交付信息齐全为止。</div>
          </div>
        )}

        {order.errorCode === 'permission_mismatch' && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>当前账号无法访问该订单</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>请使用购买时的同一个 Telegram 账号打开该订单；如仍有问题，再联系支持。</div>
          </div>
        )}

        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>订单信息</div>
          {[
            ['订单号', order.id],
            ['产品', order.productName || '--'],
            ['金额', formatOrderAmount(order.amount, order.currency)],
            ['状态', st.label],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              <span style={{ fontSize: 13, color: '#fff', fontFamily: label === '订单号' ? 'monospace' : 'inherit' }}>{val}</span>
            </div>
          ))}
        </div>

        {(showDeliveryCenter || showInstallationPlaceholder) && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#10b981', marginBottom: 16, textAlign: 'center' }}>📱 安装与交付中心</div>

            {showDeliveryCenter ? (
              <>
                {hasIccid && (
                  <div style={{ marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>ICCID</div>
                      <button onClick={() => copyText(order.esimIccid)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>复制</button>
                    </div>
                    <div style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px' }}>{order.esimIccid}</div>
                  </div>
                )}

                {showManualActivation && (
                  <div style={{ marginBottom: 16 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
                      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>手动安装码</div>
                      <button onClick={() => copyText(activationCode)} style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8, color: '#fff', fontSize: 11, padding: '4px 8px', cursor: 'pointer' }}>复制</button>
                    </div>
                    <div style={{ fontSize: 11, color: '#fff', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', wordBreak: 'break-all' }}>{activationCode}</div>
                  </div>
                )}

                {hasValidQr && (
                  <div style={{ textAlign: 'center', marginBottom: 16 }}>
                    <img src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(activationCode)}`} alt="eSIM QR Code" style={{ width: 180, height: 180, borderRadius: 12, background: '#fff', padding: 8 }} />
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>扫描二维码安装 eSIM</div>
                  </div>
                )}
              </>
            ) : (
              <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12, marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>eSIM 正式交付信息准备完成后，会在这里显示二维码、ICCID 和手动安装码。当前请保持本页开启，系统会继续自动同步。</div>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', marginBottom: 8 }}>iPhone – 扫码安装</div>
              {[
                '打开 设置 > 蜂窝网络（或移动数据） > 添加 eSIM。',
                '选择“使用二维码”，扫描本页二维码。',
                '按提示完成添加。',
                '到达目的地后，将此 eSIM 设为蜂窝数据并按需要开启数据漫游。',
              ].map((s, i) => <div key={`ios-qr-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'rgba(255,255,255,0.56)' }}><span style={{ color: '#10b981', fontWeight: 600 }}>{i + 1}.</span><span>{s}</span></div>)}

              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '14px 0 8px' }}>iPhone / Android – 手动安装</div>
              {[
                '若无法扫码，请进入添加 eSIM 流程并选择手动输入。',
                '复制本页显示的手动安装码并粘贴。',
                '完成设置后，如暂未出行，可先保留该套餐待需要时启用。',
              ].map((s, i) => <div key={`manual-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'rgba(255,255,255,0.56)' }}><span style={{ color: '#10b981', fontWeight: 600 }}>{i + 1}.</span><span>{s}</span></div>)}

              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.7)', margin: '14px 0 8px' }}>使用提醒与排查</div>
              {[
                '通常可以在出发前先安装，抵达目的地后再启用数据。',
                '如没有网络，先确认此 eSIM 已启用并被选为移动数据线路。',
                '按需要开启数据漫游，然后重启一次手机再试。',
              ].map((s, i) => <div key={`tips-${i}`} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'rgba(255,255,255,0.56)' }}><span style={{ color: '#10b981', fontWeight: 600 }}>•</span><span>{s}</span></div>)}
            </div>
          </div>
        )}

        {userStatus === ORDER_STATUS.PENDING_PAYMENT && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 16, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginBottom: 8 }}>已完成付款？</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>完成转账后返回本页，系统会自动同步状态，无需点击任何人工提交流程。</div>
          </div>
        )}

        {userStatus === ORDER_STATUS.PAYMENT_REVIEW && (
          <div style={{ background: 'rgba(249,115,22,0.08)', border: '1px solid rgba(249,115,22,0.3)', borderRadius: 16, padding: 16, textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: '#f97316', marginBottom: 8 }}>付款审核中</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)' }}>当前无需重复操作，审核通过后订单会自动进入处理中。</div>
          </div>
        )}

        {userStatus === ORDER_STATUS.FAILED && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#ef4444', marginBottom: 6 }}>自动处理失败</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', lineHeight: 1.6 }}>该订单未能自动完成。请通过下方支持入口联系人工处理，订单号和当前状态请一并发送。</div>
          </div>
        )}

        <button
          onClick={() => {
            const url = `https://t.me/Esim_sale1_bot?start=${supportMessage}`
            if (window.Telegram?.WebApp) window.Telegram.WebApp.openTelegramLink(url)
            else window.open(url, '_blank')
          }}
          style={{ width: '100%', marginTop: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.72)', fontSize: 13, padding: '12px', cursor: 'pointer' }}
        >
          需要帮助？联系支持（异常兜底）
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
