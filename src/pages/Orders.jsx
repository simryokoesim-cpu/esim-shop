import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'
import { ORDER_STATUS, getStatusConfig, normalizeOrderStatus } from '../utils/orderStatus'

export default function Orders() {
  const navigate = useNavigate()
  const { orders, cancelOrder } = useOrders()
  const [filterStatus, setFilterStatus] = useState('all')

  const normalizedOrders = useMemo(() => (
    orders.map(order => ({
      ...order,
      userStatus: normalizeOrderStatus(order),
    }))
  ), [orders])

  const filtered = filterStatus === 'all'
    ? normalizedOrders
    : normalizedOrders.filter(o => o.userStatus === filterStatus)

  const openOrderDetail = (orderId) => navigate(`/order/${orderId}`)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      <div style={{ padding: '20px 16px 16px', background: 'linear-gradient(180deg, rgba(30,20,60,0.6) 0%, transparent 100%)' }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>我的订单</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>共 {orders.length} 个订单</div>
      </div>

      <div style={{ padding: '0 16px 16px', display: 'flex', gap: '8px', overflowX: 'auto', scrollbarWidth: 'none' }}>
        {[
          { id: 'all', label: '全部' },
          { id: 'pending_payment', label: '待付款' },
          { id: 'payment_review', label: '审核中' },
          { id: 'processing', label: '处理中' },
          { id: 'delivered', label: '已发货' },
          { id: 'activated', label: '已激活' },
          { id: 'failed', label: '处理失败' },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setFilterStatus(tab.id)}
            style={{
              padding: '7px 16px',
              borderRadius: '20px',
              background: filterStatus === tab.id ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))' : 'rgba(255,255,255,0.05)',
              border: filterStatus === tab.id ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
              color: filterStatus === tab.id ? '#93c5fd' : 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              fontWeight: filterStatus === tab.id ? 600 : 400,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              flexShrink: 0,
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>
              {orders.length === 0 ? '暂无订单' : '没有匹配的订单'}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
              {orders.length === 0 ? '购买您的第一个 eSIM 套餐' : '换个分类试试'}
            </div>
            {orders.length === 0 && (
              <button
                onClick={() => navigate('/products')}
                style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', padding: '11px 28px', fontSize: '14px', fontWeight: 600, cursor: 'pointer' }}
              >
                浏览套餐
              </button>
            )}
          </div>
        ) : (
          filtered.map(order => {
            const st = getStatusConfig(order)
            const isPending = order.userStatus === ORDER_STATUS.PENDING_PAYMENT

            return (
              <button
                key={order.id}
                type="button"
                onClick={() => openOrderDetail(order.id)}
                style={{ width: '100%', textAlign: 'left', background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))', border: '1px solid rgba(255,255,255,0.08)', borderRadius: '20px', padding: '16px', marginBottom: '12px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '46px', height: '46px', borderRadius: '12px', background: 'rgba(59,130,246,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '24px' }}>
                      {order.productFlag}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>{order.productName}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>{order.id}</div>
                    </div>
                  </div>
                  <div style={{ background: st.bg, border: `1px solid ${st.color}44`, borderRadius: '20px', padding: '4px 10px', fontSize: '11px', fontWeight: 600, color: st.color, display: 'flex', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                    {st.icon} {st.label}
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '12px', background: 'rgba(59,130,246,0.12)', color: '#93c5fd', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.2)' }}>{order.dataLabel}</span>
                  <span style={{ fontSize: '12px', background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.2)' }}>{order.daysLabel}</span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa', marginLeft: 'auto' }}>${parseFloat(order.price).toFixed(2)} USDT</span>
                </div>

                <div style={{ padding: '10px 12px', background: 'rgba(255,255,255,0.03)', borderRadius: '10px', display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>下单：{order.createdAt}</div>
                  {order.expiresAt ? (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>到期：{order.expiresAt}</div>
                  ) : (
                    <div style={{ fontSize: '11px', color: isPending ? '#f59e0b' : 'rgba(255,255,255,0.4)' }}>{isPending ? '等待付款' : '查看订单详情'}</div>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openOrderDetail(order.id)
                    }}
                    style={{ flex: 1, background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', fontSize: '13px', fontWeight: 600, padding: '10px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                  >
                    查看订单详情
                  </button>
                  {isPending && (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation()
                        cancelOrder(order.id)
                      }}
                      style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', padding: '10px 14px', cursor: 'pointer', WebkitTapHighlightColor: 'transparent' }}
                    >
                      取消
                    </button>
                  )}
                </div>
              </button>
            )
          })
        )}
      </div>

      {filtered.length > 0 && (
        <div style={{ padding: '16px 16px 30px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/products')}
            style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '14px', color: 'rgba(255,255,255,0.6)', fontSize: '13px', padding: '12px 28px', cursor: 'pointer', width: '100%', WebkitTapHighlightColor: 'transparent' }}
          >
            + 购买新套餐
          </button>
        </div>
      )}
    </div>
  )
}
