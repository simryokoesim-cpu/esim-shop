import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useProducts } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'
import CategoryBar from '../components/CategoryBar'

const asiaCountryCodes = ['JP', 'KR', 'TH', 'SG', 'HK', 'TW', 'MY', 'CN', 'IN', 'ID', 'PH', 'VN', 'MO', 'BD', 'KH', 'LA', 'MM', 'NP', 'LK', 'PK', 'MN']
const europeCountryCodes = ['GB', 'FR', 'DE', 'IT', 'ES', 'NL', 'CH', 'BE', 'PL', 'SE', 'NO', 'DK', 'FI', 'PT', 'AT', 'GR', 'CZ', 'HU', 'RO']

export default function ProductList() {
  const { products, loading } = useProducts()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const initCategory = searchParams.get('category') || 'all'
  const initSearch = searchParams.get('search') || ''
  const initSort = searchParams.get('sort') || 'default'

  const [category, setCategory] = useState(initCategory)
  const [search, setSearch] = useState(initSearch)
  const [sort, setSort] = useState(initSort)
  const [showSort, setShowSort] = useState(false)

  const sortOptions = [
    { id: 'default', label: '默认排序' },
    { id: 'price_asc', label: '价格从低到高' },
    { id: 'price_desc', label: '价格从高到低' },
    { id: 'data', label: '流量从多到少' },
    { id: 'days', label: '天数从多到少' },
  ]

  const filtered = useMemo(() => {
    let result = [...products]

    // Category filter
    switch (category) {
      case 'hot':
        result = result.filter(p => p.isHot)
        break
      case 'asia':
        result = result.filter(p => p.countries?.some(c => asiaCountryCodes.includes(c.code)))
        break
      case 'europe':
        result = result.filter(p => p.countries?.some(c => europeCountryCodes.includes(c.code)))
        break
      case 'global':
        result = result.filter(p => p.type === 'global')
        break
      case 'regional':
        result = result.filter(p => p.type === 'regional')
        break
      case 'voice':
        result = result.filter(p => p.hasVoice)
        break
      case 'renewable':
        result = result.filter(p => p.isRenewable)
        break
    }

    // Search filter
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      result = result.filter(p =>
        p.name.toLowerCase().includes(q) ||
        p.countries?.some(c => c.cn?.toLowerCase().includes(q) || c.en?.toLowerCase().includes(q))
      )
    }

    // Sort
    switch (sort) {
      case 'price_asc':
        result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
        break
      case 'price_desc':
        result.sort((a, b) => parseFloat(b.price) - parseFloat(a.price))
        break
      case 'data':
        result.sort((a, b) => b.dataSize - a.dataSize)
        break
      case 'days':
        result.sort((a, b) => b.validDays - a.validDays)
        break
    }

    return result
  }, [products, category, search, sort])

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        background: 'rgba(10,10,20,0.9)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky',
        top: 0,
        zIndex: 50,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={() => navigate('/')}
            style={{
              background: 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: '#fff',
              width: '34px',
              height: '34px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              flexShrink: 0,
              fontSize: '14px',
            }}
          >
            ←
          </button>
          
          {/* Search */}
          <div style={{
            flex: 1,
            background: 'rgba(255,255,255,0.07)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '12px',
            display: 'flex',
            alignItems: 'center',
            padding: '8px 12px',
            gap: '8px',
          }}>
            <span style={{ fontSize: '14px' }}>🔍</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="搜索套餐..."
              style={{
                flex: 1,
                background: 'none',
                border: 'none',
                outline: 'none',
                color: '#fff',
                fontSize: '14px',
              }}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                style={{ background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)', cursor: 'pointer', fontSize: '16px' }}
              >
                ×
              </button>
            )}
          </div>

          {/* Sort button */}
          <button
            onClick={() => setShowSort(!showSort)}
            style={{
              background: sort !== 'default' ? 'linear-gradient(135deg, rgba(59,130,246,0.3), rgba(139,92,246,0.3))' : 'rgba(255,255,255,0.07)',
              border: sort !== 'default' ? '1px solid rgba(96,165,250,0.4)' : '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px',
              color: sort !== 'default' ? '#93c5fd' : 'rgba(255,255,255,0.6)',
              padding: '8px 12px',
              fontSize: '12px',
              cursor: 'pointer',
              flexShrink: 0,
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
            }}
          >
            ⇅ 排序
          </button>
        </div>

        {/* Category bar */}
        <CategoryBar active={category} onChange={setCategory} />

        {/* Sort dropdown */}
        {showSort && (
          <div style={{
            position: 'absolute',
            top: '100%',
            right: '16px',
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '14px',
            overflow: 'hidden',
            zIndex: 100,
            minWidth: '160px',
            boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          }}>
            {sortOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => { setSort(opt.id); setShowSort(false) }}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  background: sort === opt.id ? 'rgba(59,130,246,0.2)' : 'none',
                  border: 'none',
                  borderBottom: '1px solid rgba(255,255,255,0.05)',
                  color: sort === opt.id ? '#60a5fa' : 'rgba(255,255,255,0.7)',
                  fontSize: '13px',
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                {sort === opt.id ? '✓ ' : '  '}{opt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Results count */}
      <div style={{
        padding: '12px 16px 6px',
        fontSize: '12px',
        color: 'rgba(255,255,255,0.4)',
      }}>
        {loading ? '加载中...' : `共 ${filtered.length} 个套餐`}
      </div>

      {/* Product list */}
      <div style={{ padding: '6px 16px 16px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{
                height: '88px',
                borderRadius: '20px',
                background: 'rgba(255,255,255,0.04)',
              }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '60px 20px',
            color: 'rgba(255,255,255,0.4)',
          }}>
            <div style={{ fontSize: '48px', marginBottom: '12px' }}>🔍</div>
            <div style={{ fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>未找到匹配套餐</div>
            <div style={{ fontSize: '13px' }}>试试其他关键词或分类</div>
          </div>
        ) : (
          filtered.map(product => (
            <ProductCard key={product.id} product={product} />
          ))
        )}
      </div>
    </div>
  )
}
