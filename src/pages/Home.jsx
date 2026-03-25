import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'
import { formatData, formatDays, formatPrice, getCountryName } from '../utils/format'

const quickCategories = [
  { id: 'hot', icon: '🔥', label: '热门国家', bg: 'linear-gradient(135deg, #1e40af, #3b82f6)' },
  { id: 'regional', icon: '🗺️', label: '区域套餐', bg: 'linear-gradient(135deg, #5b21b6, #8b5cf6)' },
  { id: 'global', icon: '🌐', label: '全球套餐', bg: 'linear-gradient(135deg, #065f46, #10b981)' },
  { id: 'hot', icon: '✈️', label: '出行首选', bg: 'linear-gradient(135deg, #92400e, #f59e0b)' },
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

const faqItems = [
  {
    q: 'eSIM 如何安装？',
    a: '购买后，我们会通过 Telegram 发送 eSIM 二维码。在手机「设置 → 蜂窝网络 → 添加 eSIM」中扫描二维码即可，全程约 2 分钟。',
  },
  {
    q: '支持哪些支付方式？',
    a: '目前支持 USDT（TRC20）和 TON 两种加密货币支付，安全快捷，无需绑卡。',
  },
  {
    q: '多久能收到 eSIM？',
    a: '付款并联系客服确认后，通常 2–10 分钟内即可收到 eSIM 激活码，24小时客服在线。',
  },
  {
    q: '如何联系客服？',
    a: '可直接在 Telegram 搜索 @Esim_kefu_bot，或在结算页点击「联系客服」按钮，客服 7×24 在线为您服务。',
  },
]

function FAQ() {
  const [openIdx, setOpenIdx] = useState(null)
  return (
    <div style={{ padding: '0 16px 32px' }}>
      <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '14px' }}>
        ❓ 常见问题
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        {faqItems.map((item, i) => (
          <div
            key={i}
            style={{
              background: 'rgba(255,255,255,0.04)',
              border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '14px',
              overflow: 'hidden',
            }}
          >
            <button
              onClick={() => setOpenIdx(openIdx === i ? null : i)}
              style={{
                width: '100%', background: 'none', border: 'none',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '14px 16px', cursor: 'pointer', gap: '8px',
              }}
            >
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#e2e8f0', textAlign: 'left' }}>{item.q}</span>
              <span style={{
                fontSize: '18px', color: 'rgba(255,255,255,0.4)', flexShrink: 0,
                transform: openIdx === i ? 'rotate(180deg)' : 'none',
                transition: 'transform 0.2s',
                display: 'inline-block',
              }}>⌄</span>
            </button>
            {openIdx === i && (
              <div style={{
                padding: '0 16px 14px',
                fontSize: '12px', color: 'rgba(255,255,255,0.55)',
                lineHeight: 1.7,
              }}>
                {item.a}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
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

  // 热门国家列表（去重，按优先级排序）
  const hotCountries = useMemo(() => {
    const countryMap = {}
    products.forEach(p => {
      p.countries?.forEach(c => {
        if (hotCountryPriority[c.code] && !countryMap[c.code]) {
          // 找该国最低价
          const minPrice = products
            .filter(prod => prod.countries?.some(cc => cc.code === c.code))
            .reduce((min, prod) => Math.min(min, parseFloat(prod.price) || 999), 999)
          countryMap[c.code] = { ...c, minPrice, priority: hotCountryPriority[c.code] }
        }
      })
    })
    return Object.values(countryMap).sort((a, b) => a.priority - b.priority).slice(0, 12)
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

  // 骨架屏
  if (loading) return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', padding: '20px 16px' }}>
      <style>{`@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      {/* Header 骨架 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <div style={{ width: 36, height: 36, borderRadius: 10, background: 'rgba(255,255,255,0.08)' }} />
          <div>
            <div style={{ width: 80, height: 16, borderRadius: 6, background: 'rgba(255,255,255,0.08)', marginBottom: 6 }} />
            <div style={{ width: 60, height: 11, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
          </div>
        </div>
        <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'rgba(255,255,255,0.08)' }} />
      </div>
      {/* 欢迎语骨架 */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ width: 180, height: 24, borderRadius: 8, background: 'rgba(255,255,255,0.08)', marginBottom: 8 }} />
        <div style={{ width: 140, height: 13, borderRadius: 4, background: 'rgba(255,255,255,0.05)' }} />
      </div>
      {/* 搜索框骨架 */}
      <div style={{ height: 44, borderRadius: 14, background: 'rgba(255,255,255,0.06)', marginBottom: 24 }} />
      {/* 分类骨架 */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[80,90,80,90].map((w,i) => (
          <div key={i} style={{ width: w, height: 36, borderRadius: 20, background: 'rgba(255,255,255,0.06)' }} />
        ))}
      </div>
      {/* 产品卡片骨架 */}
      {[1,2,3,4].map(i => (
        <div key={i} style={{
          height: 88, borderRadius: 20, marginBottom: 12,
          background: 'linear-gradient(90deg,rgba(255,255,255,0.05) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.05) 75%)',
          backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite',
        }} />
      ))}
    </div>
  )

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

      {/* 热门目的地横向滑动 */}
      <div style={{ padding: '0 0 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', padding: '0 16px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>🌏 热门目的地</div>
          <button onClick={() => navigate('/products?tab=hot')} style={{ background: 'none', border: 'none', color: '#60a5fa', fontSize: '13px', cursor: 'pointer', padding: 0 }}>
            全部 →
          </button>
        </div>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingLeft: '16px', paddingRight: '16px', paddingBottom: '4px', scrollbarWidth: 'none' }}>
          {[
            {code:'TH',cn:'泰国'},{code:'JP',cn:'日本'},{code:'SG',cn:'新加坡'},
            {code:'MY',cn:'马来西亚'},{code:'KR',cn:'韩国'},{code:'HK',cn:'香港'},
            {code:'TW',cn:'台湾'},{code:'CN',cn:'中国'},{code:'ID',cn:'印尼'},
            {code:'VN',cn:'越南'},{code:'AE',cn:'阿联酋'},{code:'GB',cn:'英国'},
          ].map(c => {
            const flag = String.fromCodePoint(...[...c.code.toUpperCase()].map(ch => 0x1F1E6 - 65 + ch.charCodeAt(0)))
            return (
              <button key={c.code}
                onClick={() => navigate(`/products?tab=hot&country=${c.code}`)}
                style={{
                  flexShrink: 0, background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.08)', borderRadius: '16px',
                  padding: '12px 14px', cursor: 'pointer', textAlign: 'center', minWidth: '72px',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                <div style={{ fontSize: '28px', marginBottom: '5px' }}>{flag}</div>
                <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500, whiteSpace: 'nowrap' }}>{c.cn}</div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Hot Products */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px' }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff' }}>🔥 热门套餐</div>
          <button
            onClick={() => navigate('/products')}
            style={{
              background: 'none', border: 'none', color: '#60a5fa',
              fontSize: '13px', cursor: 'pointer', padding: 0,
            }}
          >
            查看全部 →
          </button>
        </div>

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {[1,2,3,4,5,6,7,8].map(i => (
              <div key={i} style={{
                height: '72px', borderRadius: '14px',
                background: 'rgba(255,255,255,0.05)',
                animation: 'shimmer 1.5s infinite',
              }} />
            ))}
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            {hotCountries.map(country => {
              const flag = country.code.toUpperCase().replace(/./g, c =>
                String.fromCodePoint(c.charCodeAt(0) + 127397)
              )
              return (
                <button
                  key={country.code}
                  onClick={() => navigate(`/products?country=${country.code}`)}
                  style={{
                    background: 'rgba(255,255,255,0.05)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px',
                    padding: '10px 4px',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', gap: '4px',
                    cursor: 'pointer',
                  }}
                >
                  <span style={{ fontSize: '26px', lineHeight: 1 }}>{flag}</span>
                  <span style={{ fontSize: '11px', color: '#e2e8f0', fontWeight: 500, lineHeight: 1.2 }}>
                    {country.cn || country.en}
                  </span>
                  <span style={{ fontSize: '10px', color: '#f97316' }}>
                    ${country.minPrice.toFixed(0)}起
                  </span>
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* 信任数据 */}
      <div style={{ padding: '0 16px 16px' }}>
        <div style={{ display: 'flex', gap: '10px' }}>
          {[
            { value: '200+', label: '覆盖国家' },
            { value: '2min', label: '平均激活' },
            { value: '24/7', label: '客服在线' },
          ].map((s, i) => (
            <div key={i} style={{
              flex: 1, textAlign: 'center', padding: '14px 8px',
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              borderRadius: '16px',
            }}>
              <div style={{ fontSize: '20px', fontWeight: 800, color: '#60a5fa', marginBottom: '3px' }}>{s.value}</div>
              <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.4)' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 为什么选择我们 */}
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
              { icon: '⚡', title: '即买即用', desc: '2分钟内完成激活' },
              { icon: '🔒', title: '安全支付', desc: 'USDT/TON加密支付' },
              { icon: '🌍', title: '全球覆盖', desc: '200+国家地区' },
              { icon: '↩️', title: '未激活退款', desc: '未使用可申请退款' },
              { icon: '📱', title: '无需换卡', desc: '手机扫码即可使用' },
              { icon: '💬', title: '24h客服', desc: '@Esim_sale1_bot' },
            ].map((f, i) => (
              <div key={i} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '10px',
                  background: 'rgba(59,130,246,0.15)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: '18px', flexShrink: 0,
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

        {/* 客服入口 */}
        <button
          onClick={() => {
            if (window.Telegram?.WebApp) window.Telegram.WebApp.openTelegramLink('https://t.me/Esim_sale1_bot')
          }}
          style={{
            width: '100%', marginTop: '12px', padding: '14px',
            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '16px', color: '#fff', fontSize: '14px', fontWeight: 500,
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
          }}
        >
          🎧 联系客服 @Esim_sale1_bot
        </button>
      </div>

      {/* FAQ 常见问题 */}
      <FAQ />
    </div>
  )
}
