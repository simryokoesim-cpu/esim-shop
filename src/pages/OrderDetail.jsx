import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'

const SUPABASE_URL = 'https://afdyzuohzwdvreyhnfdb.supabase.co'
const SUPABASE_KEY = 'sb_publishable_FfMQeSJTbZPfsKtMF6nyqA_Fgo_gzun'

const statusConfig = {
  pending:   { label: '等待付款', color: '#f59e0b', icon: '⏳', desc: '请按照下方付款信息完成转账' },
  paid:      { label: '已收款',   color: '#3b82f6', icon: '💳', desc: '正在处理，请稍候...' },
  delivered: { label: '已发货',   color: '#10b981', icon: '✅', desc: '您的eSIM已准备好，请扫码激活' },
  activated: { label: '已激活',   color: '#10b981', icon: '🟢', desc: 'eSIM激活成功，祝您旅途愉快！' },
  failed:    { label: '发货失败', color: '#ef4444', icon: '❌', desc: '请联系客服处理' },
}

export default function OrderDetail() {
  const { orderId } = useParams()
  const navigate = useNavigate()
  const { orders, updateOrder } = useOrders()
  const [dbOrder, setDbOrder] = useState(null)
  const [loading, setLoading] = useState(true)
  const pollRef = useRef(null)

  // 从 localStorage 找订单
  const localOrder = orders.find(o => o.id === orderId)

  // 从 Supabase 拉取最新状态
  async function fetchFromDB() {
    try {
      const res = await fetch(
        `${SUPABASE_URL}/rest/v1/miniapp_orders?id=eq.${orderId}&select=*`,
        { headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}` } }
      )
      const data = await res.json()
      if (Array.isArray(data) && data[0]) {
        setDbOrder(data[0])
        // 同步到本地
        if (data[0].status !== 'pending' && localOrder) {
          updateOrder(orderId, {
            status: data[0].status,
            esimIccid: data[0].esim_iccid,
            esimQrCode: data[0].esim_qr_code,
          })
        }
        return data[0].status
      }
    } catch (e) {}
    return null
  }

  useEffect(() => {
    setLoading(true)
    fetchFromDB().then(() => setLoading(false))

    // 轮询：每10秒检查一次，直到状态变为 delivered/activated/failed
    pollRef.current = setInterval(async () => {
      const status = await fetchFromDB()
      if (status && ['delivered', 'activated', 'failed'].includes(status)) {
        clearInterval(pollRef.current)
      }
    }, 10000)

    return () => clearInterval(pollRef.current)
  }, [orderId])

  const order = dbOrder
    ? {
        id: dbOrder.id,
        productName: dbOrder.product_name,
        amount: dbOrder.amount,
        status: dbOrder.status,
        esimIccid: dbOrder.esim_iccid,
        esimQrCode: dbOrder.esim_qr_code,
        createdAt: dbOrder.created_at,
      }
    : localOrder

  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>加载中...</div>
    </div>
  )

  if (!order) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 12 }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ color: '#fff' }}>订单不存在</div>
      <button onClick={() => navigate('/')} style={{ background: 'linear-gradient(135deg,#3b82f6,#8b5cf6)', border: 'none', borderRadius: 12, color: '#fff', padding: '10px 24px', cursor: 'pointer' }}>返回首页</button>
    </div>
  )

  const st = statusConfig[order.status] || statusConfig.pending
  const hasEsim = order.esimQrCode || order.esimIccid

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', paddingBottom: 30 }}>
      {/* Header */}
      <div style={{ padding: '16px', display: 'flex', alignItems: 'center', gap: 12, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <button onClick={() => navigate('/orders')} style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, color: '#fff', width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 14 }}>←</button>
        <span style={{ fontSize: 16, fontWeight: 600, color: '#fff' }}>订单详情</span>
      </div>

      <div style={{ padding: 16 }}>
        {/* 状态卡片 */}
        <div style={{ background: `rgba(${st.color === '#10b981' ? '16,185,129' : st.color === '#f59e0b' ? '245,158,11' : st.color === '#3b82f6' ? '59,130,246' : '239,68,68'},0.1)`, border: `1px solid ${st.color}40`, borderRadius: 20, padding: 20, marginBottom: 16, textAlign: 'center' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>{st.icon}</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: st.color, marginBottom: 4 }}>{st.label}</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>{st.desc}</div>
          {order.status === 'paid' && (
            <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#3b82f6', animation: 'pulse 1.5s infinite' }} />
              <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>自动检测中，通常1-3分钟</span>
            </div>
          )}
        </div>

        {/* 订单信息 */}
        <div style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, padding: 16, marginBottom: 16 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: 12 }}>订单信息</div>
          {[
            ['订单号', order.id],
            ['产品', order.productName],
            ['金额', `$${order.amount} USDT`],
            ['状态', st.label],
          ].map(([label, val]) => (
            <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
              <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.4)' }}>{label}</span>
              <span style={{ fontSize: 13, color: '#fff', fontFamily: label === '订单号' ? 'monospace' : 'inherit' }}>{val}</span>
            </div>
          ))}
        </div>

        {/* eSIM 信息（已发货显示） */}
        {hasEsim && (
          <div style={{ background: 'rgba(16,185,129,0.08)', border: '1px solid rgba(16,185,129,0.3)', borderRadius: 20, padding: 20, marginBottom: 16 }}>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#10b981', marginBottom: 16, textAlign: 'center' }}>📱 eSIM 激活信息</div>

            {order.esimIccid && (
              <div style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>ICCID</div>
                <div style={{ fontSize: 13, color: '#fff', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px' }}>{order.esimIccid}</div>
              </div>
            )}

            {order.esimQrCode && (
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>激活码</div>
                <div style={{ fontSize: 11, color: '#fff', fontFamily: 'monospace', background: 'rgba(255,255,255,0.06)', borderRadius: 8, padding: '8px 12px', wordBreak: 'break-all' }}>{order.esimQrCode}</div>
              </div>
            )}

            {/* 二维码图片 */}
            {order.esimQrCode && (
              <div style={{ textAlign: 'center', marginBottom: 16 }}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(order.esimQrCode)}`}
                  alt="eSIM QR Code"
                  style={{ width: 180, height: 180, borderRadius: 12, background: '#fff', padding: 8 }}
                />
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginTop: 8 }}>扫描二维码安装eSIM</div>
              </div>
            )}

            <div style={{ background: 'rgba(255,255,255,0.04)', borderRadius: 12, padding: 12 }}>
              <div style={{ fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>安装步骤</div>
              {['前往手机「设置」→「蜂窝网络」→「添加eSIM」', '选择「扫描二维码」扫码安装', '到达目的地后开启eSIM即可使用'].map((s, i) => (
                <div key={i} style={{ display: 'flex', gap: 8, marginBottom: 6, fontSize: 12, color: 'rgba(255,255,255,0.5)' }}>
                  <span style={{ color: '#10b981', fontWeight: 600 }}>{i + 1}.</span>
                  <span>{s}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* 等待付款时显示付款提示 */}
        {order.status === 'pending' && (
          <div style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.3)', borderRadius: 16, padding: 16, textAlign: 'center' }}>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,0.6)', marginBottom: 8 }}>已完成付款？</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)' }}>系统每10秒自动检测，无需手动操作</div>
          </div>
        )}

        {/* 客服 */}
        <button
          onClick={() => {
            const url = `https://t.me/Esim_sale1_bot`
            if (window.Telegram?.WebApp) window.Telegram.WebApp.openTelegramLink(url)
            else window.open(url, '_blank')
          }}
          style={{ width: '100%', marginTop: 12, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12, color: 'rgba(255,255,255,0.6)', fontSize: 13, padding: '12px', cursor: 'pointer' }}
        >
          💬 联系客服 @Esim_sale1_bot
        </button>
      </div>

      <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }`}</style>
    </div>
  )
}
