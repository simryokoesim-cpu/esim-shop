import { useState, useMemo, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAllProducts } from '../hooks/useProducts'
import ProductCard from '../components/ProductCard'

// 国旗 emoji
function getFlag(code) {
  if (!code || code.length !== 2) return '🌐'
  return String.fromCodePoint(...[...code.toUpperCase()].map(c => 0x1F1E6 - 65 + c.charCodeAt(0)))
}

// 热门国家
const HOT_COUNTRIES = [
  {code:'TH', cn:'泰国'}, {code:'JP', cn:'日本'}, {code:'SG', cn:'新加坡'},
  {code:'MY', cn:'马来西亚'}, {code:'KR', cn:'韩国'}, {code:'HK', cn:'香港'},
  {code:'TW', cn:'台湾'}, {code:'ID', cn:'印尼'}, {code:'VN', cn:'越南'},
  {code:'PH', cn:'菲律宾'}, {code:'CN', cn:'中国'}, {code:'MO', cn:'澳门'},
  {code:'LK', cn:'斯里兰卡'}, {code:'IN', cn:'印度'}, {code:'AE', cn:'阿联酋'},
  {code:'GB', cn:'英国'}, {code:'FR', cn:'法国'}, {code:'DE', cn:'德国'},
  {code:'IT', cn:'意大利'}, {code:'ES', cn:'西班牙'}, {code:'US', cn:'美国'},
  {code:'AU', cn:'澳大利亚'}, {code:'CA', cn:'加拿大'}, {code:'NZ', cn:'新西兰'},
]

// 区域套餐分组
const REGIONS = [
  { id: 'asia', cn: '亚洲', icon: '🌏', keywords: ['亚洲', '东南亚'] },
  { id: 'europe', cn: '欧洲', icon: '🏛️', keywords: ['欧洲'] },
  { id: 'mideast', cn: '中东', icon: '🕌', keywords: ['中东'] },
  { id: 'africa', cn: '非洲', icon: '🌍', keywords: ['非洲'] },
  { id: 'americas', cn: '美洲', icon: '🌎', keywords: ['美洲', '北美加勒比'] },
  { id: 'oceania', cn: '大洋洲', icon: '🏝️', keywords: ['大洋洲'] },
  { id: 'other', cn: '其他区域', icon: '🗺️', keywords: [] },
]

export default function ProductList() {
  const { products, loading } = useAllProducts()
  const navigate = useNavigate()

  const [searchParams, setSearchParams] = useSearchParams()
  const initTab = searchParams.get('tab') || 'hot'
  const initCountryCode = searchParams.get('country')
  const initSearch = searchParams.get('search') || ''
  const [tab, setTab] = useState(initTab) // hot | regional | global
  const allCountries = useMemo(() => {
    const matched = new Map()
    products.forEach(p => {
      p.countries?.forEach(c => {
        if (c?.code && !matched.has(c.code)) {
          matched.set(c.code, { code: c.code, cn: c.cn || c.en || c.code, en: c.en || c.cn || c.code })
        }
      })
    })
    return Array.from(matched.values()).sort((a, b) => {
      const aHot = HOT_COUNTRIES.some(h => h.code === a.code)
      const bHot = HOT_COUNTRIES.some(h => h.code === b.code)
      if (aHot !== bHot) return aHot ? -1 : 1
      return (a.cn || a.en || '').localeCompare(b.cn || b.en || '', 'zh-Hans-CN')
    })
  }, [products])
  const initCountry = initCountryCode ? allCountries.find(c => c.code === initCountryCode) || HOT_COUNTRIES.find(c => c.code === initCountryCode) || null : null
  const [selectedCountry, setSelectedCountry] = useState(initCountry) // { code, cn }
  const [selectedRegion, setSelectedRegion] = useState(null) // region obj
  const nonHotCountries = useMemo(
    () => allCountries.filter(c => !HOT_COUNTRIES.some(h => h.code === c.code)),
    [allCountries]
  )
  const [globalFilter, setGlobalFilter] = useState('data') // data | voice
  const [search, setSearch] = useState(initSearch)

  useEffect(() => {
    setTab(initTab)
    if (initSearch !== search) setSearch(initSearch)
  }, [initTab, initSearch])

  useEffect(() => {
    if (!initCountryCode) return
    const matched = allCountries.find(c => c.code === initCountryCode) || HOT_COUNTRIES.find(c => c.code === initCountryCode)
    if (matched) setSelectedCountry(matched)
  }, [initCountryCode, allCountries])

  const isVoiceProduct = (p) => !!(p.capability?.voice || p.capability?.sms || p.hasVoice || p.thirdPartyData?.voice || p.thirdPartyData?.text)

  // 按国家筛选并分组：单国套餐、覆盖该国的区域套餐、覆盖该国的全球套餐分开展示
  const countryProductGroups = useMemo(() => {
    const empty = { single: [], regional: [], global: [] }
    if (!selectedCountry) return empty

    const covering = products.filter(p =>
      p.countries?.some(c => c.code === selectedCountry.code)
    )
    const byPrice = (a, b) => parseFloat(a.price) - parseFloat(b.price)

    const groups = { single: [], regional: [], global: [] }
    covering.forEach(p => {
      if (p.type === 'global') groups.global.push(p)
      else if (p.countries?.length === 1) groups.single.push(p)
      else groups.regional.push(p)
    })

    return {
      single: groups.single.sort(byPrice),
      regional: groups.regional.sort(byPrice),
      global: groups.global.sort(byPrice),
    }
  }, [products, selectedCountry])

  const countryProductsTotal = countryProductGroups.single.length + countryProductGroups.regional.length + countryProductGroups.global.length

  // 区域套餐
  const regionalProducts = useMemo(() => {
    if (!selectedRegion) return []
    const regionalAll = products.filter(p => p.type === 'regional' || ((p.countries?.length || 0) > 1 && p.type !== 'global'))
    if (selectedRegion.id === 'other') {
      return regionalAll.filter(p => !REGIONS.slice(0,-1).some(r => r.keywords.some(kw => p.name.includes(kw))))
    }
    return regionalAll.filter(p => selectedRegion.keywords.some(kw => p.name.includes(kw)))
      .sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
  }, [products, selectedRegion])

  // 全球套餐（按类型筛选）
  const globalProducts = useMemo(() => {
    let result = products.filter(p => p.type === 'global')
    // 去重：同价格+同流量+同天数只保留一个（保留覆盖国家最多的）
    const grouped = {}
    result.forEach(p => {
      const key = `${p.price}-${p.dataSize}-${p.validDays}-${p.hasVoice ? 'v' : 'd'}`
      if (!grouped[key] || (p.countries?.length || 0) > (grouped[key].countries?.length || 0)) {
        grouped[key] = p
      }
    })
    result = Object.values(grouped)
    if (globalFilter === 'voice') result = result.filter(isVoiceProduct)
    else result = result.filter(p => !isVoiceProduct(p))
    return result.sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
  }, [products, globalFilter])

  // 搜索
  // 搜索匹配的国家（图标展示）
  const searchCountries = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    const matched = new Map()
    products.forEach(p => {
      if (p.countries?.length === 1) {
        const c = p.countries[0]
        if (c.cn?.toLowerCase().includes(q) || c.en?.toLowerCase().includes(q)) {
          if (!matched.has(c.code)) matched.set(c.code, { code: c.code, cn: c.cn })
        }
      }
    })
    return Array.from(matched.values()).sort((a, b) => (a.cn || a.en || '').localeCompare(b.cn || b.en || '', 'zh-Hans-CN'))
  }, [products, search])

  // 搜索匹配的区域/全球套餐
  const searchOtherResults = useMemo(() => {
    if (!search.trim()) return []
    const q = search.trim().toLowerCase()
    return products.filter(p =>
      p.countries?.length !== 1 && (
        p.name.toLowerCase().includes(q) ||
        p.countries?.some(c => c.cn?.toLowerCase().includes(q) || c.en?.toLowerCase().includes(q))
      )
    ).sort((a, b) => parseFloat(a.price) - parseFloat(b.price))
  }, [products, search])

  const tabs = [
    { id: 'hot', label: '🔥 热门国家' },
    { id: 'regional', label: '🗺️ 区域套餐' },
    { id: 'global', label: '🌐 全球套餐' },
  ]

  const selectCountry = (country) => {
    setSearch('')
    setTab('hot')
    setSelectedCountry(country)
    setSelectedRegion(null)
    setSearchParams({ tab: 'hot', country: country.code })
  }

  const clearSelectedCountry = () => {
    setSelectedCountry(null)
    setSearchParams({ tab: 'hot' })
  }

  const handleTabChange = (t) => {
    setTab(t)
    setSelectedCountry(null)
    setSelectedRegion(null)
    setSearchParams(t === 'hot' ? { tab: 'hot' } : { tab: t })
  }

  const renderProductSubgroups = (items) => {
    const dataOnly = items.filter(p => !isVoiceProduct(p))
    const voiceAndSms = items.filter(isVoiceProduct)
    return (
      <>
        {dataOnly.length > 0 && (
          <>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '8px 0 8px' }}>📶 纯数据（{dataOnly.length}）</div>
            {dataOnly.map(p => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}
          </>
        )}
        {voiceAndSms.length > 0 && (
          <>
            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.45)', margin: '14px 0 8px' }}>📞 数据/语音/短信（{voiceAndSms.length}）</div>
            {voiceAndSms.map(p => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}
          </>
        )}
      </>
    )
  }

  const isInDetail = (tab === 'hot' && selectedCountry) || (tab === 'regional' && selectedRegion)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#fff' }}>
      {/* Header */}
      <div style={{
        padding: '16px',
        background: 'rgba(10,10,20,0.95)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.06)',
        position: 'sticky', top: 0, zIndex: 50,
      }}>
        {/* Back + Search */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
          <button
            onClick={() => isInDetail ? (selectedCountry ? clearSelectedCountry() : setSelectedRegion(null)) : navigate('/')}
            style={{ background: 'rgba(255,255,255,0.08)', border: 'none', color: '#fff', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer', fontSize: '16px' }}
          >←</button>
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="搜索国家 / Search country..."
            style={{
              flex: 1, background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '10px', padding: '10px 14px', color: '#fff', fontSize: '14px', outline: 'none',
            }}
          />
        </div>

        {/* Tabs */}
        {!search && (
          <div style={{ display: 'flex', gap: '8px' }}>
            {tabs.map(t => (
              <button key={t.id} onClick={() => handleTabChange(t.id)} style={{
                flex: 1, padding: '8px 4px', borderRadius: '12px', fontSize: '12px', fontWeight: tab === t.id ? 600 : 400,
                border: tab === t.id ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                background: tab === t.id ? 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(139,92,246,0.25))' : 'rgba(255,255,255,0.04)',
                color: tab === t.id ? '#93c5fd' : 'rgba(255,255,255,0.5)', cursor: 'pointer',
              }}>{t.label}</button>
            ))}
          </div>
        )}
      </div>

      <div style={{ padding: '16px' }}>
        {/* 搜索结果 */}
        {search ? (
          <>
            {/* 匹配国家图标 */}
            {searchCountries.length > 0 && (
              <>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
                  🏳️ 匹配国家
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '24px' }}>
                  {searchCountries.map(c => (
                    <button key={c.code} onClick={() => selectCountry(c)} style={{
                      background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: '14px', padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
                    }}>
                      <div style={{ fontSize: '28px', marginBottom: '6px' }}>{getFlag(c.code)}</div>
                      <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{c.cn}</div>
                    </button>
                  ))}
                </div>
              </>
            )}

            {/* 区域套餐图标 */}
            {searchOtherResults.length > 0 && (
              <>
                <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
                  包含该地区的套餐
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '16px' }}>
                  {/* 区域套餐图标 */}
                  {(() => {
                    const q = search.trim().toLowerCase()
                    const regionMatches = REGIONS.filter(r =>
                      searchOtherResults.some(p =>
                        p.type === 'regional' && r.keywords.some(kw => p.name.includes(kw))
                      )
                    )
                    const hasGlobal = searchOtherResults.some(p => p.type === 'global')
                    return (
                      <>
                        {regionMatches.map(r => (
                          <button key={r.id} onClick={() => { setSearch(''); setTab('regional'); setSelectedRegion(r) }} style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '14px', padding: '20px 8px', cursor: 'pointer', textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>{r.icon}</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{r.cn}</div>
                          </button>
                        ))}
                        {hasGlobal && (
                          <button onClick={() => { setSearch(''); setTab('global') }} style={{
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '14px', padding: '20px 8px', cursor: 'pointer', textAlign: 'center',
                          }}>
                            <div style={{ fontSize: '32px', marginBottom: '8px' }}>🌐</div>
                            <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>全球通用</div>
                          </button>
                        )}
                      </>
                    )
                  })()}
                </div>
              </>
            )}

            {searchCountries.length === 0 && searchOtherResults.length === 0 && (
              <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>
                未找到相关套餐
              </div>
            )}
          </>
        ) : tab === 'hot' ? (
          selectedCountry ? (
            // 国家套餐列表
            <>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '8px' }}>
                {getFlag(selectedCountry.code)} {selectedCountry.cn}
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: '8px' }}>
                  本地套餐 {countryProductGroups.single.length} 个
                </span>
              </div>
              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>
                本地国家套餐、区域套餐、全球套餐已分开展示
              </div>

              {countryProductGroups.single.length > 0 && (
                <>
                  <div style={{ fontSize: '13px', color: '#93c5fd', fontWeight: 600, margin: '0 0 10px' }}>📍 本地国家套餐（{countryProductGroups.single.length}）</div>
                  {renderProductSubgroups(countryProductGroups.single)}
                </>
              )}

              {countryProductGroups.regional.length > 0 && (
                <>
                  <div style={{ fontSize: '13px', color: '#a78bfa', fontWeight: 600, margin: '22px 0 10px' }}>🗺️ 覆盖该国家的区域套餐（{countryProductGroups.regional.length}）</div>
                  {renderProductSubgroups(countryProductGroups.regional)}
                </>
              )}

              {countryProductGroups.global.length > 0 && (
                <>
                  <div style={{ fontSize: '13px', color: '#34d399', fontWeight: 600, margin: '22px 0 10px' }}>🌐 覆盖该国家的全球套餐（{countryProductGroups.global.length}）</div>
                  {renderProductSubgroups(countryProductGroups.global)}
                </>
              )}
            </>
          ) : (
            // 国家网格
            <>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>选择目的地国家</div>

              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>热门国家</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px', marginBottom: '20px' }}>
                {HOT_COUNTRIES.map(c => (
                  <button key={c.code} onClick={() => selectCountry(c)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px', padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>{getFlag(c.code)}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{c.cn}</div>
                  </button>
                ))}
              </div>

              <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)', marginBottom: '10px' }}>
                其他国家 / 地区（共 {nonHotCountries.length} 个）
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                {nonHotCountries.map(c => (
                  <button key={c.code} onClick={() => selectCountry(c)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px', padding: '14px 8px', cursor: 'pointer', textAlign: 'center',
                    transition: 'all 0.2s',
                  }}>
                    <div style={{ fontSize: '28px', marginBottom: '6px' }}>{getFlag(c.code)}</div>
                    <div style={{ fontSize: '11px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{c.cn}</div>
                  </button>
                ))}
              </div>
            </>
          )
        ) : tab === 'regional' ? (
          selectedRegion ? (
            // 区域套餐列表
            <>
              <div style={{ fontSize: '20px', fontWeight: 700, marginBottom: '16px' }}>
                {selectedRegion.icon} {selectedRegion.cn}
                <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', fontWeight: 400, marginLeft: '8px' }}>
                  共 {regionalProducts.length} 个套餐
                </span>
              </div>
              {regionalProducts.map(p => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}
            </>
          ) : (
            // 区域网格
            <>
              <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '16px' }}>选择区域</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                {REGIONS.map(r => (
                  <button key={r.id} onClick={() => setSelectedRegion(r)} style={{
                    background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '14px', padding: '20px 8px', cursor: 'pointer', textAlign: 'center',
                  }}>
                    <div style={{ fontSize: '32px', marginBottom: '8px' }}>{r.icon}</div>
                    <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{r.cn}</div>
                  </button>
                ))}
              </div>
            </>
          )
        ) : (
          // 全球套餐列表
          <>
            {/* 全球套餐子分类 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
              {[
                { id: 'data', label: '📶 纯数据' },
                { id: 'voice', label: '📞 数据/语音/短信' },
              ].map(f => (
                <button key={f.id} onClick={() => setGlobalFilter(f.id)} style={{
                  flex: 1, padding: '8px 4px', borderRadius: '12px', fontSize: '12px',
                  fontWeight: globalFilter === f.id ? 600 : 400,
                  border: globalFilter === f.id ? '1px solid rgba(96,165,250,0.5)' : '1px solid rgba(255,255,255,0.08)',
                  background: globalFilter === f.id ? 'linear-gradient(135deg,rgba(59,130,246,0.25),rgba(139,92,246,0.25))' : 'rgba(255,255,255,0.04)',
                  color: globalFilter === f.id ? '#93c5fd' : 'rgba(255,255,255,0.4)', cursor: 'pointer',
                }}>{f.label}</button>
              ))}
            </div>
            <div style={{ fontSize: '13px', color: 'rgba(255,255,255,0.4)', marginBottom: '12px' }}>
              共 {globalProducts.length} 个套餐
            </div>
            {globalProducts.map(p => <ProductCard key={p.id} product={p} onClick={() => navigate(`/product/${p.id}`)} />)}
          </>
        )}

        {loading && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.3)', padding: '40px' }}>加载中...</div>
        )}
        {!loading && !search && tab === 'hot' && selectedCountry && countryProductsTotal === 0 && (
          <div style={{ textAlign: 'center', color: 'rgba(255,255,255,0.4)', padding: '40px' }}>
            <div style={{ fontSize: '40px', marginBottom: '12px' }}>😕</div>
            <div>暂无该国家的套餐，请稍后再试</div>
          </div>
        )}
      </div>
    </div>
  )
}
