import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'
import { formatData, formatDays, formatPrice, getCountryName } from '../utils/format'

const quickCategories = [
  { id: 'asia', icon: '🌏', label: '亚洲热门', bg: 'linear-gradient(135deg, #1e40af, #3b82f6)' },
  { id: 'europe', icon: '🏛️', label: '欧洲漫游', bg: 'linear-gradient(135deg, #5b21b6, #8b5cf6)' },
  { id: 'global', icon: '🌐', label: '全球套餐', bg: 'linear-gradient(135deg, #065f46, #10b981)' },
  { id: 'renewable', icon: '🔄', label: '可续费', bg: 'linear-gradient(135deg, #92400e, #f59e0b)' },
]

const asiaCountryCodes = ['JP', 'KR', 'TH', 'SG', 'HK', 'TW', 'MY', 'CN', 'IN', 'ID', 'PH', 'VN', 'MO', 'BD', 'KH', 'LA', 'MM', 'NP', 'LK', 'PK', 'MN']
const europeCountryCodes = ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'CH', 'BE', 'PL', 'SE', 'NO', 'DK', 'FI', 'PT', 'AT', 'GR', 'CZ', 'HU', 'RO']

// 热门旅游目的地优先级（数字越小越靠前）
const hotCountryPriority = {
  'TH': 1, 'JP': 2, 'SG': 3, 'MY': 4, 'KR': 5,
  'HK': 6, 'TW': 7, 'ID': 8, 'VN': 9, 'PH': 10,
  'CN': 11, 'MO': 12, 'LK': 13, 'IN': 14, 'AE': 15,
  'GB': 16, 'FR': 17, 'DE': 18, 'IT': 19, 'ES': 20,
}

const getProductPriority = (p) => {
  if (!p.countries?.length) return 999
  const codes = p.countries.map(c => c.code)
  const best = codes.reduce((min, code) => {
    const rank = hotCountryPriority[code] || 999
    return rank < min ? rank : min
  }, 999)
  return best
}

export default function Home() {
  const { products, total, loading } = useAllProducts()
  const navigate = useNavigate()
  const [search, setSearch] = useState('')

  // Get user info from Telegram
  const tgUser = window.Telegram?.WebApp?.initDataUnsafe?.user
  const userName = tgUser?.first_name || 'Hi'
  const userAvatar = tgUser?.photo_url

  const hotProducts = useMemo(() => {
    if (!products.length) return []
    return products
      .filter(p => p.countries?.some(c => asiaCountryCodes.includes(c.code)))
      .sort((a, b) => getProductPriority(a) - getProductPriority(b))
      .slice(0, 8)
  }, [products])

  const recommendedProducts = useMemo(() => {
    if (!products.length) return []
    return products
      .filter(p => parseFloat(p.price) < 20)
      .slice(0, 5)
  }, [products])

  const handleSearch = (e) => {
    e.preventDefault()
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search)}`)
    }
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <div style={{
        padding: '20px 16px 16px',
        background: 'linear-gradient(180deg, rgba(30,20,60,0.8) 0%, transparent 100%)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{
              width: '36px',
              height: '36px',
              borderRadius: '10px',
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '18px',
            }}>
              📶
            </div>
            <div>
              <div style={{ fontSize: '17px', fontWeight: 700, color: '#fff' }}>eSIM 商城</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>全球eSIM套餐</div>
            </div>
          </div>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            fontSize: '18px',
          }}>
            {userAvatar ? (
              <img src={userAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            ) : (
              '👤'
            )}
          </div>
        </div>

        {/* Greeting */}
        <div style={{ marginTop: '16px', marginBottom: '16px' }}>
          <div style={{ fontSize: '22px', fontWeight: 700, color: '#fff' }}>
            你好，{userName} 👋
          </div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.45)', marginTop: '2px' }}>
            全球{total > 0 ? `${total}+` : '2700+'}套餐，即买即用
          </div>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch}>
          <div style={{
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            display: 'flex',
            alignItems: 'center',
            padding: '11px 14px',
            gap: '10px',
          }}>
            <span style={{ fontSize: '16px' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索目的地、套餐..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '14px',
                '::placeholder': { color: 'rgba(255,255,255,0.3)' },
              }}
            />
            {search && (
              <button type="submit" style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px',
                padding: '4px 10px',
                cursor: 'pointer',
              }}>搜索</button>
            )}
          </div>
        </form>
      </div>

      {/* Hero Banner */}
      <div style={{ padding: '0 16px 20px' }}>
        <div style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, #1e3a8a 0%, #312e81 50%, #1e1b4b 100%)',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
        }}>
          <div style={{
            position: 'absolute',
            top: '-30px',
            right: '-30px',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: 'rgba(96,165,250,0.15)',
            filter: 'blur(20px)',
          }} />
          <div style={{ position: 'relative', zIndex: 1 }}>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', marginBottom: '4px' }}>限时优惠</div>
            <div style={{ fontSize: '20px', fontWeight: 700, color: '#fff', marginBottom: '8px' }}>
              🎁 新用户首单立减10%
            </div>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '16px' }}>
              支持 USDT 支付，安全快速，全球即用
            </div>
            <button
              onClick={() => navigate('/products')}
              style={{
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                border: 'none',
                borderRadius: '12px',
                color: '#fff',
                fontSize: '14px',
                fontWeight: 600,
                padding: '10px 24px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
              }}
            >
              浏览全部套餐 →
            </button>
          </div>
        </div>
      </div>

      {/* Quick Categories */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '12px' }}>
          快速分类
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          {quickCategories.map(cat => (
            <button
              key={cat.id}
              onClick={() => navigate(`/products?category=${cat.id}`)}
              style={{
                borderRadius: '16px',
                background: cat.bg,
                border: 'none',
                padding: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                WebkitTapHighlightColor: 'transparent',
                textAlign: 'left',
              }}
            >
              <span style={{ fontSize: '26px' }}>{cat.icon}</span>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{cat.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Hot Products */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>🔥 热门套餐</div>
          <button
            onClick={() => navigate('/products')}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            查看全部 →
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3].map(i => (
              <div key={i} style={{
                height: '88px',
                borderRadius: '20px',
                background: 'linear-gradient(90deg, rgba(255,255,255,0.05) 25%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.05) 75%)',
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }} />
            ))}
          </div>
        ) : (
          <div>
            {hotProducts.map(product => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </div>

      {/* Affordable Picks */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>💰 超值推荐</div>
          <button
            onClick={() => navigate('/products?sort=price')}
            style={{
              background: 'none',
              border: 'none',
              color: '#60a5fa',
              fontSize: '13px',
              cursor: 'pointer',
              padding: 0,
            }}
          >
            更多 →
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {recommendedProducts.map(product => (
            <ProductCard key={product.id} product={product} compact />
          ))}
        </div>
      </div>

      {/* Features */}
      <div style={{ padding: '0 16px 30px' }}>
        <div style={{
          borderRadius: '20px',
          background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
          border: '1px solid rgba(255,255,255,0.08)',
          padding: '20px',
        }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '16px' }}>为什么选择我们</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            {[
              { icon: '⚡', title: '即买即用', desc: '购买后立刻激活' },
              { icon: '🔒', title: '安全支付', desc: 'USDT加密支付' },
              { icon: '🌍', title: '全球覆盖', desc: '200+国家地区' },
              { icon: '💬', title: '客服支持', desc: '24小时在线' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px',
                  height: '36px',
                  borderRadius: '10px',
                  background: 'rgba(59,130,246,0.15)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  flexShrink: 0,
                }}>
                  {f.icon}
                </div>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{f.title}</div>
                  <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)', marginTop: '2px' }}>{f.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
