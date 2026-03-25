import { useNavigate, useLocation } from 'react-router-dom'

const tabs = [
  { path: '/', icon: '🏠', label: '首页' },
  { path: '/products', icon: '📦', label: '套餐' },
  { path: '/orders', icon: '📋', label: '订单' },
  { path: '/profile', icon: '👤', label: '我的' },
]

export default function NavBar() {
  const navigate = useNavigate()
  const location = useLocation()

  return (
    <nav
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        height: '65px',
        background: 'rgba(10, 10, 20, 0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        zIndex: 100,
        paddingBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      {tabs.map(tab => {
        const isActive = location.pathname === tab.path || 
          (tab.path === '/products' && location.pathname.startsWith('/product'))
        return (
          <button
            key={tab.path}
            onClick={() => navigate(tab.path)}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '3px',
              padding: '8px 20px',
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: isActive ? '#60a5fa' : 'rgba(255,255,255,0.4)',
              transition: 'all 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span style={{ fontSize: '22px', lineHeight: 1 }}>{tab.icon}</span>
            <span style={{
              fontSize: '11px',
              fontWeight: isActive ? 600 : 400,
              letterSpacing: '0.5px',
            }}>{tab.label}</span>
            {isActive && (
              <div style={{
                position: 'absolute',
                bottom: 0,
                width: '4px',
                height: '4px',
                borderRadius: '50%',
                background: '#60a5fa',
              }} />
            )}
          </button>
        )
      })}
    </nav>
  )
}
