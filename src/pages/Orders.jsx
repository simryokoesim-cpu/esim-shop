import { useState } from 'react'
import { useNavigate } from 'react-router-dom'

// Mock orders data for demo
const mockOrders = [
  {
    id: 'ESM1A2B3C4D',
    productName: '日本 3GB/15天',
    productFlag: '🇯🇵',
    dataLabel: '3GB',
    daysLabel: '15天',
    price: '12.00',
    status: 'active',
    createdAt: '2026-03-19',
    activatedAt: '2026-03-19',
    expiresAt: '2026-04-03',
  },
  {
    id: 'ESM5E6F7G8H',
    productName: '韩国 2GB/10天',
    productFlag: '🇰🇷',
    dataLabel: '2GB',
    daysLabel: '10天',
    price: '9.50',
    status: 'expired',
    createdAt: '2026-03-01',
    activatedAt: '2026-03-01',
    expiresAt: '2026-03-11',
  },
  {
    id: 'ESM9I0J1K2L',
    productName: '亚洲 500MB/3天',
    productFlag: '🌏',
    dataLabel: '500MB',
    daysLabel: '3天',
    price: '4.80',
    status: 'pending',
    createdAt: '2026-03-21',
    activatedAt: null,
    expiresAt: null,
  },
]

const statusConfig = {
  pending: { label: '待付款', color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '⏳' },
  active: { label: '已激活', color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '✅' },
  expired: { label: '已到期', color: 'rgba(255,255,255,0.3)', bg: 'rgba(255,255,255,0.05)', icon: '⌛' },
}

export default function Orders() {
  const navigate = useNavigate()
  const [filterStatus, setFilterStatus] = useState('all')

  const filtered = filterStatus === 'all' ? mockOrders : mockOrders.filter(o => o.status === filterStatus)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 16px',
        background: 'linear-gradient(180deg, rgba(30,20,60,0.6) 0%, transparent 100%)',
      }}>
        <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>我的订单</div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>管理您的 eSIM 套餐</div>
      </div>

      {/* Filter tabs */}
      <div style={{
        padding: '0 16px 16px',
        display: 'flex',
        gap: '8px',
      }}>
        {[
          { id: 'all', label: '全部' },
          { id: 'pending', label: '待付款' },
          { id: 'active', label: '已激活' },
          { id: 'expired', label: '已到期' },
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
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Orders list */}
      <div style={{ padding: '0 16px' }}>
        {filtered.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '60px 20px' }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>📋</div>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff', marginBottom: '8px' }}>暂无订单</div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '20px' }}>
              购买您的第一个 eSIM 套餐
            </div>
            <button
              onClick={() => navigate('/products')}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                padding: '11px 28px',
                fontSize: '14px',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              浏览套餐
            </button>
          </div>
        ) : (
          filtered.map(order => {
            const st = statusConfig[order.status]
            return (
              <div key={order.id} style={{
                background: 'linear-gradient(135deg, rgba(255,255,255,0.06), rgba(255,255,255,0.03))',
                border: '1px solid rgba(255,255,255,0.08)',
                borderRadius: '20px',
                padding: '16px',
                marginBottom: '12px',
              }}>
                {/* Top row */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '46px',
                      height: '46px',
                      borderRadius: '12px',
                      background: 'rgba(59,130,246,0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '24px',
                    }}>
                      {order.productFlag}
                    </div>
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '3px' }}>
                        {order.productName}
                      </div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', fontFamily: 'monospace' }}>
                        {order.id}
                      </div>
                    </div>
                  </div>
                  <div style={{
                    background: st.bg,
                    border: `1px solid ${st.color}44`,
                    borderRadius: '20px',
                    padding: '4px 10px',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: st.color,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}>
                    {st.icon} {st.label}
                  </div>
                </div>

                {/* Specs row */}
                <div style={{
                  display: 'flex',
                  gap: '8px',
                  marginBottom: '12px',
                }}>
                  <span style={{ fontSize: '12px', background: 'rgba(59,130,246,0.12)', color: '#93c5fd', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(59,130,246,0.2)' }}>
                    {order.dataLabel}
                  </span>
                  <span style={{ fontSize: '12px', background: 'rgba(139,92,246,0.12)', color: '#c4b5fd', padding: '3px 10px', borderRadius: '20px', border: '1px solid rgba(139,92,246,0.2)' }}>
                    {order.daysLabel}
                  </span>
                  <span style={{ fontSize: '12px', fontWeight: 600, color: '#60a5fa', marginLeft: 'auto' }}>
                    ${order.price}
                  </span>
                </div>

                {/* Dates */}
                <div style={{
                  padding: '10px 12px',
                  background: 'rgba(255,255,255,0.03)',
                  borderRadius: '10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                }}>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                    下单：{order.createdAt}
                  </div>
                  {order.expiresAt ? (
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>
                      到期：{order.expiresAt}
                    </div>
                  ) : (
                    <div style={{ fontSize: '11px', color: '#f59e0b' }}>
                      等待付款
                    </div>
                  )}
                </div>

                {/* Actions */}
                {order.status === 'pending' && (
                  <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => navigate(`/checkout/${order.id}`)}
                      style={{
                        flex: 1,
                        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                        border: 'none',
                        borderRadius: '12px',
                        color: '#fff',
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '10px',
                        cursor: 'pointer',
                      }}
                    >
                      继续付款
                    </button>
                    <button
                      style={{
                        background: 'rgba(255,255,255,0.06)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '12px',
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: '13px',
                        padding: '10px 16px',
                        cursor: 'pointer',
                      }}
                    >
                      取消
                    </button>
                  </div>
                )}
              </div>
            )
          })
        )}
      </div>

      {/* Empty state CTA */}
      {filtered.length > 0 && (
        <div style={{ padding: '16px 16px 30px', textAlign: 'center' }}>
          <button
            onClick={() => navigate('/products')}
            style={{
              background: 'rgba(255,255,255,0.05)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '14px',
              color: 'rgba(255,255,255,0.6)',
              fontSize: '13px',
              padding: '12px 28px',
              cursor: 'pointer',
              width: '100%',
            }}
          >
            + 购买新套餐
          </button>
        </div>
      )}
    </div>
  )
}
