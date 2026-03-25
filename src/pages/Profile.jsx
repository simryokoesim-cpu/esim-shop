import { useNavigate } from 'react-router-dom'
import { useOrders } from '../hooks/useOrders'

const BOT_USERNAME = 'Esim_sal_bot'

export default function Profile() {
  const navigate = useNavigate()
  const { orders } = useOrders()

  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const userName = tgUser?.first_name || 'Hi'
  const userAvatar = tgUser?.photo_url

  const activeOrders = orders.filter(o => o.status === 'active' || o.status === 'activated').length
  const pendingOrders = orders.filter(o => o.status === 'pending').length

  const openBot = (cmd) => {
    const url = `https://t.me/${BOT_USERNAME}?start=${cmd}`
    if (window.Telegram?.WebApp) {
      window.Telegram.WebApp.openTelegramLink(url)
    } else {
      window.open(url, '_blank')
    }
  }

  const menuItems = [
    { icon: '📦', label: '我的订单', desc: `${orders.length} 个订单`, action: () => navigate('/orders') },
    { icon: '💰', label: '我的余额', desc: '查看余额和提现', action: () => openBot('balance') },
    { icon: '👥', label: '推荐赚钱', desc: '推荐好友得佣金', action: () => openBot('referral') },
    { icon: '💳', label: '绑定钱包', desc: 'USDT TRC20 地址', action: () => openBot('wallet') },
    { icon: '🎧', label: '联系客服', desc: '@Esim_sale1_bot', action: () => {
      if (window.Telegram?.WebApp) {
        window.Telegram.WebApp.openTelegramLink('https://t.me/Esim_sale1_bot')
      }
    }},
  ]

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', paddingBottom: '80px' }}>
      {/* 用户信息头部 */}
      <div style={{
        padding: '30px 16px 24px',
        background: 'linear-gradient(180deg, rgba(30,20,60,0.8) 0%, transparent 100%)',
        textAlign: 'center',
      }}>
        <div style={{
          width: '72px', height: '72px', borderRadius: '50%', margin: '0 auto 12px',
          background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '32px', overflow: 'hidden',
        }}>
          {userAvatar
            ? <img src={userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : '👤'
          }
        </div>
        <div style={{ fontSize: '18px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>
          {userName}
        </div>
        <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)' }}>
          eSIM 商城会员
        </div>
      </div>

      {/* 统计卡片 */}
      <div style={{ padding: '0 16px 20px', display: 'flex', gap: '10px' }}>
        {[
          { label: '全部订单', value: orders.length, color: '#60a5fa' },
          { label: '使用中', value: activeOrders, color: '#10b981' },
          { label: '待付款', value: pendingOrders, color: '#f59e0b' },
        ].map((stat, i) => (
          <div key={i} onClick={() => navigate('/orders')} style={{
            flex: 1, background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '16px', padding: '14px 10px', textAlign: 'center', cursor: 'pointer',
          }}>
            <div style={{ fontSize: '22px', fontWeight: 700, color: stat.color, marginBottom: '4px' }}>{stat.value}</div>
            <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* 功能菜单 */}
      <div style={{ padding: '0 16px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px', overflow: 'hidden',
        }}>
          {menuItems.map((item, i) => (
            <div key={i}>
              {i > 0 && <div style={{ height: '1px', background: 'rgba(255,255,255,0.05)', margin: '0 16px' }} />}
              <button onClick={item.action} style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: '14px',
                padding: '16px', background: 'none', border: 'none', cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent', textAlign: 'left',
              }}>
                <div style={{
                  width: '40px', height: '40px', borderRadius: '12px', flexShrink: 0,
                  background: 'rgba(255,255,255,0.07)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '20px',
                }}>{item.icon}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '2px' }}>{item.label}</div>
                  <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)' }}>{item.desc}</div>
                </div>
                <div style={{ fontSize: '16px', color: 'rgba(255,255,255,0.25)' }}>›</div>
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
