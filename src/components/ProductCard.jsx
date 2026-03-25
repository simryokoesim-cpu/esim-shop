import { useNavigate } from 'react-router-dom'
import { formatData, formatPrice, formatDays, getCountryName } from '../utils/format'

// 国旗 emoji 生成
function getFlag(code) {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
}

// 智能标签生成
function getSmartTags(product) {
  const tags = []
  const price = parseFloat(product.price)
  const dataGB = product.dataSize / 1024

  if (product.isUnlimited || product.dataSize === 0) {
    tags.push({ text: '无限流量', color: '#f59e0b', bg: 'rgba(245,158,11,0.15)' })
  } else if (dataGB >= 10) {
    tags.push({ text: '大流量', color: '#10b981', bg: 'rgba(16,185,129,0.15)' })
  }

  if (product.hasVoice) tags.push({ text: '含通话', color: '#8b5cf6', bg: 'rgba(139,92,246,0.15)' })
  if (product.renewable) tags.push({ text: '可续费', color: '#06b6d4', bg: 'rgba(6,182,212,0.15)' })
  if (product.type === 'global') tags.push({ text: '全球通用', color: '#3b82f6', bg: 'rgba(59,130,246,0.15)' })

  // 性价比标签（流量/价格比高）
  if (!product.isUnlimited && product.dataSize > 0 && price > 0) {
    const ratio = (product.dataSize / 1024) / price
    if (ratio > 0.5) tags.push({ text: '高性价比', color: '#ef4444', bg: 'rgba(239,68,68,0.15)' })
  }

  return tags.slice(0, 3)
}

export default function ProductCard({ product, compact = false }) {
  const navigate = useNavigate()
  const countryName = getCountryName(product)
  // 全球套餐用地球图标，区域套餐用地图图标，本地套餐用国旗
  const flagEmoji = product.type === 'global' ? '🌐' 
    : product.type === 'regional' ? '🗺️'
    : getFlag(product.countries?.[0]?.code)
  const tags = getSmartTags(product)
  const dataLabel = product.isUnlimited || product.dataSize === 0 ? '无限流量' : formatData(product.dataSize, false)
  const daysLabel = formatDays(product.validDays)

  if (compact) {
    return (
      <div
        onClick={() => navigate(`/product/${product.id}`)}
        style={{
          background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: '16px',
          padding: '14px',
          cursor: 'pointer',
          minWidth: '140px',
          flexShrink: 0,
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>{flagEmoji}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{countryName}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
          {dataLabel} · {daysLabel}
        </div>
        <div style={{
          fontSize: '16px', fontWeight: 700,
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
        }}>
          ${formatPrice(product.price)}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '16px',
        cursor: 'pointer',
        marginBottom: '10px',
        WebkitTapHighlightColor: 'transparent',
        transition: 'border-color 0.2s',
      }}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {/* 国旗 */}
        <div style={{
          width: '52px', height: '52px', borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.15), rgba(139,92,246,0.15))',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: '26px', flexShrink: 0,
        }}>
          {flagEmoji}
        </div>

        {/* 套餐信息 */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 700, color: '#fff', marginBottom: '2px' }}>
            {countryName}
          </div>
          {/* 规格 */}
          <div style={{ display: 'flex', gap: '6px', alignItems: 'center', marginBottom: '6px' }}>
            <span style={{ fontSize: '13px', color: '#60a5fa', fontWeight: 600 }}>{dataLabel}</span>
            <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}>·</span>
            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>{daysLabel}</span>
          </div>
          {/* 标签 */}
          {tags.length > 0 && (
            <div style={{ display: 'flex', gap: '5px', flexWrap: 'wrap' }}>
              {tags.map((tag, i) => (
                <span key={i} style={{
                  fontSize: '10px', fontWeight: 600,
                  background: tag.bg, color: tag.color,
                  padding: '2px 7px', borderRadius: '20px',
                }}>
                  {tag.text}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* 价格 + 购买 */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.35)', textAlign: 'right', marginBottom: '1px' }}>USDT</div>
            <div style={{
              fontSize: '22px', fontWeight: 800, lineHeight: 1,
              background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
              WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
            }}>
              ${formatPrice(product.price)}
            </div>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); navigate(`/checkout/${product.id}`) }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff', border: 'none', borderRadius: '10px',
              padding: '7px 14px', fontSize: '12px', fontWeight: 600,
              cursor: 'pointer', WebkitTapHighlightColor: 'transparent',
            }}
          >
            购买
          </button>
        </div>
      </div>
    </div>
  )
}
