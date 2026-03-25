import { useNavigate, useParams } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import { formatData, formatDays, formatPrice, getCountryName, getTypeLabel } from '../utils/format'

export default function ProductDetail() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { products, loading } = useAllProducts()

  const product = products.find(p => p.id === parseInt(id))

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '14px' }}>加载中...</div>
      </div>
    )
  }

  if (!product) {
    return (
      <div style={{ minHeight: '100vh', background: '#0a0a0f', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
        <div style={{ fontSize: '48px' }}>😕</div>
        <div style={{ color: '#fff', fontSize: '16px' }}>套餐不存在</div>
        <button onClick={() => navigate(-1)} style={{ background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)', border: 'none', borderRadius: '12px', color: '#fff', padding: '10px 24px', cursor: 'pointer' }}>
          返回
        </button>
      </div>
    )
  }

  const countryName = getCountryName(product)
  const dataLabel = formatData(product.dataSize, product.isUnlimited)
  const daysLabel = formatDays(product.validDays)

    const activationPolicy = product.thirdPartyData?.activationPolicy
  const validityNote = activationPolicy === 'first-usage' ? '首次使用后开始计算' : '购买后立即生效'

  const specs = [
    { label: '流量', value: dataLabel, icon: '📊' },
    { label: `有效期（${validityNote}）`, value: daysLabel, icon: '📅' },
    { label: '网络制式', value: product.thirdPartyData?.speed || '4G/LTE', icon: '📶' },
    { label: '运营商', value: product.thirdPartyData?.operatorTitle || '当地主流运营商', icon: '📡' },
    { label: '覆盖', value: product.countries?.length > 1 ? `${product.countries.length}个国家/地区` : (product.countries?.[0]?.cn || '全球'), icon: '🌍' },
    { label: '兼容设备', value: 'iPhone XS+ / 支持eSIM的安卓', icon: '📱' },
    { label: '退款政策', value: '未激活可退款', icon: '↩️' },
  ]

  const tags = []
  if (product.isRenewable) tags.push({ icon: '🔄', text: '可续费', color: '#10b981' })
  if (product.hasVoice) tags.push({ icon: '📱', text: '含语音通话', color: '#8b5cf6' })
  if (product.isUnlimited) tags.push({ icon: '♾️', text: '无限流量', color: '#f59e0b' })
  if (product.type === 'global') tags.push({ icon: '🌐', text: '全球通用', color: '#3b82f6' })
  tags.push({ icon: '⚡', text: '即买即用', color: '#ef4444' })

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Hero section */}
      <div style={{
        background: 'linear-gradient(180deg, #1e1b4b 0%, #0a0a0f 100%)',
        padding: '16px 16px 32px',
        position: 'relative',
        overflow: 'hidden',
      }}>
        {/* Decorative orbs */}
        <div style={{
          position: 'absolute',
          top: '-40px',
          right: '-40px',
          width: '160px',
          height: '160px',
          borderRadius: '50%',
          background: 'rgba(96,165,250,0.12)',
          filter: 'blur(30px)',
        }} />
        <div style={{
          position: 'absolute',
          bottom: '0',
          left: '30%',
          width: '100px',
          height: '100px',
          borderRadius: '50%',
          background: 'rgba(139,92,246,0.12)',
          filter: 'blur(20px)',
        }} />

        {/* Back button */}
        <button
          onClick={() => navigate(-1)}
          style={{
            background: 'rgba(255,255,255,0.08)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '10px',
            color: '#fff',
            width: '34px',
            height: '34px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            marginBottom: '24px',
            fontSize: '14px',
            position: 'relative',
            zIndex: 1,
          }}
        >
          ←
        </button>

        {/* Flag and name */}
        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div style={{ fontSize: '72px', marginBottom: '12px', lineHeight: 1 }}>{product.flag}</div>
          <div style={{ fontSize: '24px', fontWeight: 700, color: '#fff', marginBottom: '4px' }}>{countryName}</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>{product.name}</div>
          
          {/* Price */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'baseline',
            gap: '4px',
          }}>
            <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.5)' }}>USDT</span>
            <span style={{
              fontSize: '42px',
              fontWeight: 800,
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
            }}>
              {formatPrice(product.price)}
            </span>
          </div>
        </div>
      </div>

      {/* Tags */}
      <div style={{ padding: '16px 16px 0', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
        {tags.map((tag, i) => (
          <span key={i} style={{
            fontSize: '12px',
            background: `${tag.color}20`,
            color: tag.color,
            padding: '4px 12px',
            borderRadius: '20px',
            border: `1px solid ${tag.color}40`,
          }}>
            {tag.icon} {tag.text}
          </span>
        ))}
      </div>

      {/* Specs */}
      <div style={{ padding: '16px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '14px 16px 10px', fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
            套餐规格
          </div>
          {specs.map((spec, i) => (
            <div key={i} style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '12px 16px',
              borderBottom: i < specs.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'rgba(255,255,255,0.5)', fontSize: '13px' }}>
                <span>{spec.icon}</span>
                <span>{spec.label}</span>
              </div>
              <span style={{ fontSize: '13px', fontWeight: 600, color: '#fff' }}>{spec.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Features */}
      {product.features && product.features.length > 0 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>套餐特性</div>
            {product.features.map((f, i) => (
              <div key={i} style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '6px 0',
                color: 'rgba(255,255,255,0.75)',
                fontSize: '13px',
              }}>
                <span style={{ color: '#10b981', fontSize: '12px' }}>✓</span>
                {f}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Country list if multiple */}
      {product.countries && product.countries.length > 1 && (
        <div style={{ padding: '0 16px 16px' }}>
          <div style={{
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: '20px',
            padding: '16px',
          }}>
            <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '12px' }}>
              覆盖 {product.countries.length} 个国家/地区
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
              {product.countries.map((c, i) => (
                <span key={i} style={{
                  fontSize: '12px',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.7)',
                  padding: '4px 10px',
                  borderRadius: '8px',
                }}>
                  {c.cn || c.en}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Description */}
      <div style={{ padding: '0 16px 100px' }}>
        <div style={{
          background: 'rgba(255,255,255,0.04)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '20px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: 'rgba(255,255,255,0.5)', marginBottom: '10px' }}>套餐说明</div>
          <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
            {product.description}
          </div>
        </div>
      </div>

      {/* 激活步骤 */}
      <div style={{ padding: '0 16px 24px' }}>
        <div style={{
          background: 'rgba(59,130,246,0.06)',
          border: '1px solid rgba(59,130,246,0.15)',
          borderRadius: '20px',
          padding: '16px',
        }}>
          <div style={{ fontSize: '13px', fontWeight: 600, color: '#93c5fd', marginBottom: '12px' }}>📱 如何激活使用</div>
          {[
            { step: '1', text: '购买后收到 eSIM 二维码' },
            { step: '2', text: '手机设置 → 蜂窝网络 → 添加 eSIM → 扫描二维码' },
            { step: '3', text: '到达目的地后开启该 eSIM 上网' },
          ].map(s => (
            <div key={s.step} style={{ display: 'flex', gap: '10px', alignItems: 'flex-start', marginBottom: '10px' }}>
              <div style={{
                width: '22px', height: '22px', borderRadius: '50%', flexShrink: 0,
                background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '11px', fontWeight: 700, color: '#fff',
              }}>{s.step}</div>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.7)', lineHeight: 1.5, paddingTop: '2px' }}>{s.text}</div>
            </div>
          ))}
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginTop: '4px' }}>
            ⚠️ 需要手机支持 eSIM 功能（iPhone XS及以上，多数新款安卓）
          </div>
        </div>
      </div>

      {/* Sticky Buy Button */}
      <div style={{
        position: 'fixed',
        bottom: '65px',
        left: 0,
        right: 0,
        padding: '12px 16px',
        background: 'rgba(10,10,15,0.95)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.06)',
      }}>
        <button
          onClick={() => navigate(`/checkout/${product.id}`)}
          style={{
            width: '100%',
            background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
            border: 'none',
            borderRadius: '16px',
            color: '#fff',
            fontSize: '16px',
            fontWeight: 700,
            padding: '16px',
            cursor: 'pointer',
            WebkitTapHighlightColor: 'transparent',
            boxShadow: '0 4px 24px rgba(59,130,246,0.4)',
          }}
        >
          立即购买 · ${formatPrice(product.price)} USDT
        </button>
      </div>
    </div>
  )
}
