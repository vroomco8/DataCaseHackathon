import { useRef, useEffect, useState, useMemo, useCallback } from 'react'
import mapboxgl from 'mapbox-gl'
import 'mapbox-gl/dist/mapbox-gl.css'
import Papa from 'papaparse'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie, Cell, Legend
} from 'recharts'
import { getIso3 } from './utils/countryToIso'
import './App.css'

const ACCENT_COLORS = ['#06b6d4', '#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ef4444', '#ec4899', '#f97316', '#84cc16', '#a78bfa']

const CHOROPLETH_STOPS = [
  [0, '#0f172a'],
  [0.3, '#042f2e'],
  [0.8, '#134e4a'],
  [1.4, '#0f766e'],
  [2.0, '#0d9488'],
  [2.6, '#14b8a6'],
  [3.2, '#2dd4bf'],
  [4.0, '#5eead4'],
]

function fmt(val) {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`
  if (val >= 1) return `$${val.toFixed(1)}M`
  if (val >= 0.001) return `$${(val * 1000).toFixed(0)}K`
  return `$${val.toFixed(4)}M`
}

function fmtShort(val) {
  if (val >= 1000) return `$${(val / 1000).toFixed(1)}B`
  if (val >= 1) return `$${val.toFixed(0)}M`
  return `$${(val * 1000).toFixed(0)}K`
}

function logScale(val) {
  return val > 0 ? Math.log10(val + 1) : 0
}

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || '#06b6d4' }}>
          {p.name}: {fmtShort(p.value)}
        </p>
      ))}
    </div>
  )
}

const CustomBarTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null
  return (
    <div className="chart-tooltip">
      <p className="tooltip-label">{payload[0].payload.name}</p>
      <p style={{ color: '#06b6d4' }}>{fmt(payload[0].value)}</p>
    </div>
  )
}

export default function App() {
  const mapContainerRef = useRef(null)
  const mapRef = useRef(null)
  const mapLoadedRef = useRef(false)
  const seenIsoCodes = useRef(new Set())
  const popupRef = useRef(null)
  const mapViewRef = useRef('received')

  const [rawData, setRawData] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadProgress, setLoadProgress] = useState(0)
  const [totalRows] = useState(130628)

  const [yearFrom, setYearFrom] = useState(2018)
  const [yearTo, setYearTo] = useState(2023)
  const [selectedSector, setSelectedSector] = useState('All')
  const [selectedDonorCountry, setSelectedDonorCountry] = useState('All')
  const [selectedRegion, setSelectedRegion] = useState('All')
  const [mapView, setMapView] = useState('received')
  mapViewRef.current = mapView
  const [clickedCountry, setClickedCountry] = useState(null)
  const [activeTab, setActiveTab] = useState('donors')

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    const accumulated = []
    const csvName = 'OECD Dataset.xlsx - complete_p4d3_df.csv'
    const url = '/data/' + encodeURIComponent(csvName)

    Papa.parse(url, {
      download: true,
      header: true,
      skipEmptyLines: true,
      step(result) {
        const r = result.data
        const amount = parseFloat(r.usd_disbursements_defl)
        if (!isNaN(amount) && amount > 0 && r.country && r.year) {
          accumulated.push({
            year: parseInt(r.year, 10),
            org: r.organization_name || '',
            country: r.country.trim(),
            region: (r.region_macro || '').trim(),
            donorCountry: (r.Donor_country || '').trim(),
            amount,
            sector: (r.sector_description || 'Unspecified').trim(),
            subsector: (r.subsector_description || '').trim(),
          })
        }
        if (accumulated.length % 5000 === 0) {
          setLoadProgress(accumulated.length)
        }
      },
      complete() {
        setRawData(accumulated)
        setLoading(false)
      },
      error() {
        setLoading(false)
      },
    })
  }, [])

  // ── Filter options ────────────────────────────────────────────────────────
  const availableSectors = useMemo(() => {
    const s = new Set(rawData.map(r => r.sector).filter(Boolean))
    return ['All', ...Array.from(s).sort()]
  }, [rawData])

  const availableDonorCountries = useMemo(() => {
    const s = new Set(rawData.map(r => r.donorCountry).filter(Boolean))
    return ['All', ...Array.from(s).sort()]
  }, [rawData])

  const availableRegions = useMemo(() => {
    const s = new Set(rawData.map(r => r.region).filter(Boolean))
    return ['All', ...Array.from(s).sort()]
  }, [rawData])

  const availableYears = useMemo(() => {
    const s = new Set(rawData.map(r => r.year).filter(Boolean))
    return Array.from(s).sort()
  }, [rawData])

  // ── Filtered data ─────────────────────────────────────────────────────────
  const filteredData = useMemo(() => {
    return rawData.filter(r =>
      r.year >= yearFrom &&
      r.year <= yearTo &&
      (selectedSector === 'All' || r.sector === selectedSector) &&
      (selectedDonorCountry === 'All' || r.donorCountry === selectedDonorCountry) &&
      (selectedRegion === 'All' || r.region === selectedRegion)
    )
  }, [rawData, yearFrom, yearTo, selectedSector, selectedDonorCountry, selectedRegion])

  // ── Aggregations ──────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const totalFunding = filteredData.reduce((s, r) => s + r.amount, 0)
    const donors = new Set(filteredData.map(r => r.org)).size
    const recipients = new Set(filteredData.map(r => r.country)).size
    const grants = filteredData.length
    return { totalFunding, donors, recipients, grants }
  }, [filteredData])

  const countryReceivedFunding = useMemo(() => {
    const map = {}
    filteredData.forEach(r => { map[r.country] = (map[r.country] || 0) + r.amount })
    return map
  }, [filteredData])

  const countryGivenFunding = useMemo(() => {
    const map = {}
    filteredData.forEach(r => {
      if (r.donorCountry) map[r.donorCountry] = (map[r.donorCountry] || 0) + r.amount
    })
    return map
  }, [filteredData])

  const activeFundingMap = mapView === 'received' ? countryReceivedFunding : countryGivenFunding

  const topDonors = useMemo(() => {
    const map = {}
    filteredData.forEach(r => { map[r.org] = (map[r.org] || 0) + r.amount })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, amount]) => ({ name: name.length > 30 ? name.slice(0, 28) + '…' : name, fullName: name, amount }))
  }, [filteredData])

  const topRecipients = useMemo(() => {
    return Object.entries(countryReceivedFunding)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([name, amount]) => ({ name, amount }))
  }, [countryReceivedFunding])

  const sectorData = useMemo(() => {
    const map = {}
    filteredData.forEach(r => { map[r.sector] = (map[r.sector] || 0) + r.amount })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, amount], i) => ({
        name: name.length > 22 ? name.slice(0, 20) + '…' : name,
        fullName: name,
        amount,
        color: ACCENT_COLORS[i % ACCENT_COLORS.length],
      }))
  }, [filteredData])

  const trendData = useMemo(() => {
    const map = {}
    filteredData.forEach(r => { map[r.year] = (map[r.year] || 0) + r.amount })
    return Object.entries(map)
      .sort((a, b) => a[0] - b[0])
      .map(([year, amount]) => ({ year: parseInt(year), amount }))
  }, [filteredData])

  const clickedCountryData = useMemo(() => {
    if (!clickedCountry) return null
    const { displayName, iso } = clickedCountry
    const received = filteredData.filter(r => getIso3(r.country) === iso)
    const given = filteredData.filter(r => getIso3(r.donorCountry) === iso)

    const topDonorsForCountry = {}
    received.forEach(r => { topDonorsForCountry[r.org] = (topDonorsForCountry[r.org] || 0) + r.amount })
    const topDonorsList = Object.entries(topDonorsForCountry)
      .sort((a, b) => b[1] - a[1]).slice(0, 5)
      .map(([name, amount]) => ({ name: name.length > 25 ? name.slice(0, 23) + '…' : name, amount }))

    const sectorMap = {}
    received.forEach(r => { sectorMap[r.sector] = (sectorMap[r.sector] || 0) + r.amount })
    const sectors = Object.entries(sectorMap)
      .sort((a, b) => b[1] - a[1]).slice(0, 6)
      .map(([name, amount], i) => ({ name: name.length > 20 ? name.slice(0, 18) + '…' : name, amount, color: ACCENT_COLORS[i] }))

    const yearTrend = {}
    received.forEach(r => { yearTrend[r.year] = (yearTrend[r.year] || 0) + r.amount })
    const trend = Object.entries(yearTrend).sort((a, b) => a[0] - b[0])
      .map(([year, amount]) => ({ year: parseInt(year), amount }))

    return {
      country: displayName,
      totalReceived: received.reduce((s, r) => s + r.amount, 0),
      totalGiven: given.reduce((s, r) => s + r.amount, 0),
      grantCount: received.length,
      topDonors: topDonorsList,
      sectors,
      trend,
    }
  }, [clickedCountry, filteredData])

  // ── Map initialization ────────────────────────────────────────────────────
  useEffect(() => {
    if (!mapContainerRef.current) return

    mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: 'mapbox://styles/mapbox/dark-v10',
      center: [10, 20],
      zoom: 1.5,
      projection: 'naturalEarth',
      dragRotate: false,
      touchZoomRotate: false,
    })

    mapRef.current = map
    popupRef.current = new mapboxgl.Popup({ closeButton: false, maxWidth: '240px' })

    map.addControl(new mapboxgl.NavigationControl(), 'top-right')

    map.on('load', () => {
      map.addSource('countries', {
        type: 'vector',
        url: 'mapbox://mapbox.country-boundaries-v1',
        promoteId: { country_boundaries: 'iso_3166_1_alpha_3' },
      })

      map.addLayer({
        id: 'countries-fill',
        type: 'fill',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'fill-color': [
            'interpolate', ['linear'],
            ['coalesce', ['feature-state', 'logValue'], 0],
            ...CHOROPLETH_STOPS.flat(),
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hovered'], false], 0.95,
            0.82,
          ],
        },
      })

      map.addLayer({
        id: 'countries-border',
        type: 'line',
        source: 'countries',
        'source-layer': 'country_boundaries',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hovered'], false], '#06b6d4',
            '#1e293b',
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hovered'], false], 1.5,
            0.4,
          ],
        },
      })

      mapLoadedRef.current = true

      let hoveredId = null

      map.on('mousemove', 'countries-fill', (e) => {
        if (!e.features.length) return
        const f = e.features[0]
        const iso = f.properties.iso_3166_1_alpha_3
        const name = f.properties.name_en

        if (hoveredId && hoveredId !== iso) {
          map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: hoveredId }, { hovered: false })
        }
        hoveredId = iso
        map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: iso }, { hovered: true })
        map.getCanvas().style.cursor = 'pointer'

        // Find funding for this country
        const isoToCountry = window.__isoToCountry || {}
        const countryName = isoToCountry[iso] || name
        const funding = window.__activeFunding || {}
        const amount = funding[countryName] || 0

        popupRef.current
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="map-popup">
              <div class="popup-country">${name}</div>
              ${amount > 0 ? `<div class="popup-amount">${mapViewRef.current === 'received' ? 'Received' : 'Donated'}: <strong>${fmt(amount)}</strong></div>` : '<div class="popup-no-data">No data in current filters</div>'}
            </div>
          `)
          .addTo(map)
      })

      map.on('mouseleave', 'countries-fill', () => {
        if (hoveredId) {
          map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: hoveredId }, { hovered: false })
          hoveredId = null
        }
        map.getCanvas().style.cursor = ''
        popupRef.current.remove()
      })

      map.on('click', 'countries-fill', (e) => {
        if (!e.features.length) return
        const name = e.features[0].properties.name_en
        const iso = e.features[0].properties.iso_3166_1_alpha_3
        setClickedCountry(prev => prev?.iso === iso ? null : { displayName: name, iso })
      })
    })

    return () => {
      map.remove()
      mapLoadedRef.current = false
    }
  }, [])

  // ── Update map choropleth ─────────────────────────────────────────────────
  const updateMapColors = useCallback(() => {
    const map = mapRef.current
    if (!map || !mapLoadedRef.current) return

    // Build reverse mapping: ISO → country name for popup lookups
    const isoToCountry = {}
    Object.entries(activeFundingMap).forEach(([country, _]) => {
      const iso = getIso3(country)
      if (iso) isoToCountry[iso] = country
    })
    window.__isoToCountry = isoToCountry
    window.__activeFunding = activeFundingMap

    // Reset previously seen countries
    seenIsoCodes.current.forEach(iso => {
      map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: iso }, { logValue: 0 })
    })
    seenIsoCodes.current.clear()

    // Set new values
    Object.entries(activeFundingMap).forEach(([country, amount]) => {
      const iso = getIso3(country)
      if (!iso) return
      const logValue = logScale(amount)
      map.setFeatureState({ source: 'countries', sourceLayer: 'country_boundaries', id: iso }, { logValue })
      seenIsoCodes.current.add(iso)
    })
  }, [activeFundingMap])

  useEffect(() => {
    if (mapLoadedRef.current) {
      updateMapColors()
    }
  }, [updateMapColors])

  // Also update when map finishes loading (if data was ready first)
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const handler = () => { updateMapColors() }
    map.on('styledata', handler)
    return () => map.off('styledata', handler)
  }, [updateMapColors])

  // ── Render ────────────────────────────────────────────────────────────────
  const progressPct = Math.min(99, Math.round((loadProgress / totalRows) * 100))

  return (
    <div className="dashboard">
      {/* ── Loading Screen ── */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading-box">
            <div className="loading-logo">🌍</div>
            <h2>Global Philanthropy Intelligence</h2>
            <p>Loading OECD funding dataset…</p>
            <div className="progress-bar-track">
              <div className="progress-bar-fill" style={{ width: `${progressPct}%` }} />
            </div>
            <span className="progress-text">{loadProgress.toLocaleString()} rows processed</span>
          </div>
        </div>
      )}

      {/* ── Header ── */}
      <header className="dashboard-header">
        <div className="header-left">
          <span className="header-globe">🌍</span>
          <div>
            <h1>Global Philanthropy Intelligence</h1>
            <p>OECD Development Finance — {filteredData.length.toLocaleString()} grants in view</p>
          </div>
        </div>
        <div className="kpi-bar">
          <div className="kpi-card">
            <span className="kpi-value">{fmtShort(stats.totalFunding)}</span>
            <span className="kpi-label">Total Funding</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.grants.toLocaleString()}</span>
            <span className="kpi-label">Grants</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.donors.toLocaleString()}</span>
            <span className="kpi-label">Donors</span>
          </div>
          <div className="kpi-card">
            <span className="kpi-value">{stats.recipients}</span>
            <span className="kpi-label">Countries</span>
          </div>
        </div>
      </header>

      {/* ── Filter Bar ── */}
      <div className="filter-bar">
        <div className="filter-group">
          <label>Year From</label>
          <select value={yearFrom} onChange={e => setYearFrom(+e.target.value)}>
            {availableYears.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Year To</label>
          <select value={yearTo} onChange={e => setYearTo(+e.target.value)}>
            {availableYears.map(y => <option key={y}>{y}</option>)}
          </select>
        </div>
        <div className="filter-group filter-wide">
          <label>Sector</label>
          <select value={selectedSector} onChange={e => setSelectedSector(e.target.value)}>
            {availableSectors.map(s => <option key={s}>{s}</option>)}
          </select>
        </div>
        <div className="filter-group filter-wide">
          <label>Donor Country</label>
          <select value={selectedDonorCountry} onChange={e => setSelectedDonorCountry(e.target.value)}>
            {availableDonorCountries.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
        <div className="filter-group filter-wide">
          <label>Recipient Region</label>
          <select value={selectedRegion} onChange={e => setSelectedRegion(e.target.value)}>
            {availableRegions.map(r => <option key={r}>{r}</option>)}
          </select>
        </div>
        <div className="filter-group">
          <label>Map Shows</label>
          <div className="toggle-group">
            <button className={mapView === 'received' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setMapView('received')}>Received</button>
            <button className={mapView === 'given' ? 'toggle-btn active' : 'toggle-btn'} onClick={() => setMapView('given')}>Donated</button>
          </div>
        </div>
        {(selectedSector !== 'All' || selectedDonorCountry !== 'All' || selectedRegion !== 'All') && (
          <button className="clear-btn" onClick={() => {
            setSelectedSector('All')
            setSelectedDonorCountry('All')
            setSelectedRegion('All')
          }}>✕ Clear Filters</button>
        )}
      </div>

      {/* ── Main Content ── */}
      <div className="content-grid">
        {/* Left Panel */}
        <aside className="side-panel left-panel">
          <div className="panel-tabs">
            <button className={activeTab === 'donors' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('donors')}>Top Donors</button>
            <button className={activeTab === 'sectors' ? 'tab-btn active' : 'tab-btn'} onClick={() => setActiveTab('sectors')}>Sectors</button>
          </div>

          {activeTab === 'donors' && (
            <div className="panel-content">
              <p className="panel-subtitle">By total disbursements {selectedDonorCountry !== 'All' ? `from ${selectedDonorCountry}` : 'globally'}</p>
              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={topDonors} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                  <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis type="category" dataKey="name" width={110} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomBarTooltip />} />
                  <Bar dataKey="amount" radius={[0, 3, 3, 0]}>
                    {topDonors.map((_, i) => <Cell key={i} fill={ACCENT_COLORS[i % ACCENT_COLORS.length]} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {activeTab === 'sectors' && (
            <div className="panel-content">
              <p className="panel-subtitle">Funding by sector</p>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie data={sectorData} dataKey="amount" nameKey="name" cx="50%" cy="50%" outerRadius={80} innerRadius={40}>
                    {sectorData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
                  </Pie>
                  <Tooltip formatter={(v) => fmtShort(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="sector-legend">
                {sectorData.map((s, i) => (
                  <div key={i} className="legend-item">
                    <span className="legend-dot" style={{ background: s.color }} />
                    <span className="legend-name" title={s.fullName}>{s.name}</span>
                    <span className="legend-val">{fmtShort(s.amount)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>

        {/* Map */}
        <div className="map-wrap">
          <div ref={mapContainerRef} className="map-container" />
          <div className="map-legend">
            <span className="legend-title">{mapView === 'received' ? 'Funding Received' : 'Funding Donated'}</span>
            <div className="legend-gradient" />
            <div className="legend-labels">
              <span>Less</span>
              <span>More</span>
            </div>
          </div>
          {clickedCountry && (
            <button className="map-close-country" onClick={() => setClickedCountry(null)}>✕ {clickedCountry.displayName}</button>
          )}
        </div>

        {/* Right Panel */}
        <aside className="side-panel right-panel">
          {clickedCountry && clickedCountryData ? (
            <CountryDetail data={clickedCountryData} onClose={() => setClickedCountry(null)} />
          ) : (
            <>
              <div className="panel-header">
                <h3>Top Recipients</h3>
                <span className="panel-subtitle">Most funding received</span>
              </div>
              <div className="panel-content">
                <ResponsiveContainer width="100%" height={320}>
                  <BarChart data={topRecipients} layout="vertical" margin={{ left: 0, right: 16, top: 4, bottom: 4 }}>
                    <XAxis type="number" tickFormatter={fmtShort} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="name" width={80} tick={{ fill: '#9ca3af', fontSize: 10 }} axisLine={false} tickLine={false} />
                    <Tooltip content={<CustomBarTooltip />} />
                    <Bar dataKey="amount" radius={[0, 3, 3, 0]}>
                      {topRecipients.map((_, i) => <Cell key={i} fill={`hsl(${160 + i * 12}, 70%, ${55 - i * 3}%)`} />)}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
                <p className="panel-hint">Click a country on the map for details</p>
              </div>
            </>
          )}
        </aside>
      </div>

      {/* ── Trend Row ── */}
      <div className="trend-row">
        <div className="trend-panel">
          <div className="trend-header">
            <h3>Funding Over Time</h3>
            <span className="panel-subtitle">Annual disbursements in USD millions</span>
          </div>
          <ResponsiveContainer width="100%" height={140}>
            <AreaChart data={trendData} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
              <defs>
                <linearGradient id="trendGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.35} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tickFormatter={fmtShort} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={56} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="amount" name="Funding" stroke="#06b6d4" strokeWidth={2} fill="url(#trendGrad)" dot={{ fill: '#06b6d4', r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div className="trend-panel">
          <div className="trend-header">
            <h3>Top Donors by Region</h3>
            <span className="panel-subtitle">Funding distributed per macro-region</span>
          </div>
          <RegionBreakdown filteredData={filteredData} />
        </div>
      </div>
    </div>
  )
}

function CountryDetail({ data, onClose }) {
  return (
    <div className="country-detail">
      <div className="detail-header">
        <div>
          <h3>{data.country}</h3>
          <span className="panel-subtitle">{data.grantCount.toLocaleString()} grants received</span>
        </div>
        <button className="detail-close" onClick={onClose}>✕</button>
      </div>

      <div className="detail-kpis">
        <div className="detail-kpi">
          <span className="detail-kpi-val">{fmt(data.totalReceived)}</span>
          <span className="detail-kpi-lbl">Received</span>
        </div>
        {data.totalGiven > 0 && (
          <div className="detail-kpi">
            <span className="detail-kpi-val">{fmt(data.totalGiven)}</span>
            <span className="detail-kpi-lbl">Donated</span>
          </div>
        )}
      </div>

      {data.topDonors.length > 0 && (
        <div className="detail-section">
          <h4>Top Donors</h4>
          {data.topDonors.map((d, i) => (
            <div key={i} className="detail-row">
              <span className="detail-rank">{i + 1}</span>
              <span className="detail-name" title={d.name}>{d.name}</span>
              <span className="detail-amount">{fmtShort(d.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {data.sectors.length > 0 && (
        <div className="detail-section">
          <h4>By Sector</h4>
          {data.sectors.map((s, i) => (
            <div key={i} className="detail-row">
              <span className="detail-dot" style={{ background: s.color }} />
              <span className="detail-name" title={s.name}>{s.name}</span>
              <span className="detail-amount">{fmtShort(s.amount)}</span>
            </div>
          ))}
        </div>
      )}

      {data.trend.length > 1 && (
        <div className="detail-section">
          <h4>Trend</h4>
          <ResponsiveContainer width="100%" height={80}>
            <AreaChart data={data.trend} margin={{ left: 0, right: 4, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="detailGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="year" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
              <Tooltip formatter={(v) => fmtShort(v)} labelFormatter={(l) => `Year: ${l}`} />
              <Area type="monotone" dataKey="amount" stroke="#06b6d4" strokeWidth={1.5} fill="url(#detailGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  )
}

function RegionBreakdown({ filteredData }) {
  const data = useMemo(() => {
    const map = {}
    filteredData.forEach(r => {
      if (r.region) map[r.region] = (map[r.region] || 0) + r.amount
    })
    return Object.entries(map)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([name, amount], i) => ({ name, amount, color: ACCENT_COLORS[i] }))
  }, [filteredData])

  return (
    <ResponsiveContainer width="100%" height={140}>
      <BarChart data={data} margin={{ left: 8, right: 16, top: 8, bottom: 4 }}>
        <XAxis dataKey="name" tick={{ fill: '#6b7280', fontSize: 9 }} axisLine={false} tickLine={false} />
        <YAxis tickFormatter={fmtShort} tick={{ fill: '#6b7280', fontSize: 10 }} axisLine={false} tickLine={false} width={52} />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="amount" name="Funding" radius={[3, 3, 0, 0]}>
          {data.map((entry, i) => <Cell key={i} fill={entry.color} />)}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  )
}
