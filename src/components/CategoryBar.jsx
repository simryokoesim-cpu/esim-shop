const categories = [
  { id: 'all', icon: '✨', label: '全部' },
  { id: 'hot', icon: '🔥', label: '热门国家' },
  { id: 'regional', icon: '🗺️', label: '区域套餐' },
  { id: 'global', icon: '🌐', label: '全球套餐' },
]

export default function CategoryBar({ active, onChange }) {
  return (
    <div style={{
      display: 'flex',
      gap: '8px',
      overflowX: 'auto',
      paddingBottom: '4px',
      scrollbarWidth: 'none',
    }}>
      {categories.map(cat => {
        const isActive = active === cat.id
        return (
          <button
            key={cat.id}
            onClick={() => onChange(cat.id)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              padding: '8px 16px',
              borderRadius: '20px',
              border: isActive ? '1px solid rgba(96, 165, 250, 0.6)' : '1px solid rgba(255,255,255,0.1)',
              background: isActive
                ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))'
                : 'rgba(255,255,255,0.05)',
              color: isActive ? '#93c5fd' : 'rgba(255,255,255,0.5)',
              fontSize: '13px',
              fontWeight: isActive ? 600 : 400,
              whiteSpace: 'nowrap',
              cursor: 'pointer',
              transition: 'all 0.2s',
              flexShrink: 0,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <span>{cat.icon}</span>
            <span>{cat.label}</span>
          </button>
        )
      })}
    </div>
  )
}

export { categories }
