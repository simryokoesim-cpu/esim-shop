import { useNavigate } from 'react-router-dom'
import { formatData, formatPrice, formatDays, getCountryName } from '../utils/format'

export default function ProductCard({ product, compact = false }) {
  const navigate = useNavigate()
  const countryName = getCountryName(product)

  const tags = []
  if (product.isHot) tags.push({ icon: '🔥', text: '热门', color: '#ef4444' })
  if (product.isRenewable) tags.push({ icon: '🔄', text: '可续费', color: '#10b981' })
  if (product.hasVoice) tags.push({ icon: '📱', text: '含通话', color: '#8b5cf6' })
  if (product.isUnlimited) tags.push({ icon: '♾️', text: '无限流量', color: '#f59e0b' })
  if (product.type === 'global') tags.push({ icon: '🌐', text: '全球', color: '#3b82f6' })
  else if (product.type === 'regional') tags.push({ icon: '🗺️', text: '区域', color: '#06b6d4' })

  const dataLabel = formatData(product.dataSize, product.isUnlimited)
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
          transition: 'transform 0.2s',
          WebkitTapHighlightColor: 'transparent',
        }}
      >
        <div style={{ fontSize: '28px', marginBottom: '6px' }}>{product.flag}</div>
        <div style={{ fontSize: '13px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{countryName}</div>
        <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.5)', marginBottom: '6px' }}>
          {dataLabel} / {daysLabel}
        </div>
        <div style={{
          fontSize: '15px',
          fontWeight: 700,
          background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          ${formatPrice(product.price)}
        </div>
      </div>
    )
  }

  return (
    <div
      style={{
        background: 'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: '20px',
        padding: '18px',
        cursor: 'pointer',
        transition: 'transform 0.2s',
        WebkitTapHighlightColor: 'transparent',
        marginBottom: '12px',
      }}
      onClick={() => navigate(`/product/${product.id}`)}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
        {/* Flag + Country */}
        <div style={{
          width: '54px',
          height: '54px',
          borderRadius: '14px',
          background: 'linear-gradient(135deg, rgba(59,130,246,0.2), rgba(139,92,246,0.2))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '28px',
          flexShrink: 0,
        }}>
          {product.flag}
        </div>

        {/* Info */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: '15px', fontWeight: 600, color: '#fff', marginBottom: '3px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {countryName}
          </div>
          <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', marginBottom: '6px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {product.name}
          </div>
          {/* Specs */}
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <span style={{
              fontSize: '11px',
              background: 'rgba(59,130,246,0.15)',
              color: '#93c5fd',
              padding: '2px 8px',
              borderRadius: '20px',
              border: '1px solid rgba(59,130,246,0.25)',
            }}>
              {dataLabel}
            </span>
            <span style={{
              fontSize: '11px',
              background: 'rgba(139,92,246,0.15)',
              color: '#c4b5fd',
              padding: '2px 8px',
              borderRadius: '20px',
              border: '1px solid rgba(139,92,246,0.25)',
            }}>
              {daysLabel}
            </span>
            {tags.slice(0, 2).map((tag, i) => (
              <span key={i} style={{
                fontSize: '11px',
                background: `${tag.color}22`,
                color: tag.color,
                padding: '2px 8px',
                borderRadius: '20px',
                border: `1px solid ${tag.color}44`,
              }}>
                {tag.icon} {tag.text}
              </span>
            ))}
          </div>
        </div>

        {/* Price + Buy */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '8px', flexShrink: 0 }}>
          <div style={{
            fontSize: '20px',
            fontWeight: 700,
            background: 'linear-gradient(135deg, #60a5fa, #a78bfa)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}>
            ${formatPrice(product.price)}
          </div>
          <button
            onClick={(e) => {
              e.stopPropagation()
              navigate(`/checkout/${product.id}`)
            }}
            style={{
              background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
              color: '#fff',
              border: 'none',
              borderRadius: '10px',
              padding: '7px 14px',
              fontSize: '12px',
              fontWeight: 600,
              cursor: 'pointer',
              WebkitTapHighlightColor: 'transparent',
              whiteSpace: 'nowrap',
            }}
          >
            立即购买
          </button>
        </div>
      </div>
    </div>
  )
}
