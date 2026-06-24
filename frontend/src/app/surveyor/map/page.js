'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect, useCallback } from 'react'
import { getParcelGeofeed, getPendingHeatmap } from '@/lib/api'

// Leaflet must be dynamically imported — no SSR
const LiveMap = dynamic(() => import('@/components/LiveMap'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-full text-forest-400 text-sm">
      Loading map…
    </div>
  ),
})

// ── Legend items ──────────────────────────────────────────────────────────────

const PARCEL_LEGEND = [
  { color: '#2d6a4f', label: 'Registered' },
  { color: '#d4a017', label: 'Unregistered' },
  { color: '#f57c00', label: 'Pending' },
  { color: '#c62828', label: 'Disputed' },
]

const APP_LEGEND = [
  { color: '#0288d1', label: 'Submitted' },
  { color: '#f57c00', label: 'Survey Required' },
  { color: '#00796b', label: 'Surveyed' },
  { color: '#7b1fa2', label: 'Legal Review' },
  { color: '#c62828', label: 'Under Objection' },
]

const ZONE_OPTIONS = ['', 'RM-N', 'RM-S', 'RM-E', 'RM-W', 'HB-N', 'HB-S', 'BT-C', 'JR-N', 'JR-S']
const STATUS_OPTIONS = ['', 'registered', 'unregistered', 'pending', 'disputed']

// ── Main page ─────────────────────────────────────────────────────────────────

export default function LiveMapPage() {
  const [parcels, setParcels]       = useState(null)
  const [pending, setPending]       = useState(null)
  const [loading, setLoading]       = useState(true)
  const [error, setError]           = useState(null)
  const [zoneFilter, setZoneFilter] = useState('')
  const [statusFilter, setStatus]   = useState('')
  const [showParcels, setShowP]     = useState(true)
  const [showPending, setShowPend]  = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = {}
      if (zoneFilter) params.zone_id = zoneFilter
      if (statusFilter) params.status = statusFilter

      const [p, h] = await Promise.all([
        getParcelGeofeed(params),
        getPendingHeatmap(),
      ])
      setParcels(p)
      setPending(h)
    } catch (e) {
      setError('Failed to load map data. Is the backend running?')
    } finally {
      setLoading(false)
    }
  }, [zoneFilter, statusFilter])

  useEffect(() => { load() }, [load])

  const parcelCount  = parcels?.count ?? 0
  const pendingCount = pending?.count ?? 0

  return (
    <div className="max-w-7xl mx-auto px-6 py-8 space-y-4">

      {/* Header */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">Live Parcel Map</h1>
          <p className="text-forest-500 text-sm mt-0.5">
            {parcelCount} parcel{parcelCount !== 1 ? 's' : ''}
            {pendingCount > 0 && ` · ${pendingCount} pending application${pendingCount !== 1 ? 's' : ''}`}
          </p>
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="px-4 py-2 bg-forest-600 text-white text-sm rounded-lg hover:bg-forest-700 disabled:opacity-50 shrink-0"
        >
          {loading ? 'Refreshing…' : 'Refresh'}
        </button>
      </div>

      {/* Filter bar */}
      <div className="bg-white border border-forest-100 rounded-xl px-5 py-3 flex flex-wrap gap-4 items-center shadow-sm">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-forest-600 uppercase tracking-wide">Zone</label>
          <select
            value={zoneFilter}
            onChange={e => setZoneFilter(e.target.value)}
            className="text-sm border border-forest-200 rounded-lg px-2 py-1.5 bg-white text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-300"
          >
            {ZONE_OPTIONS.map(z => (
              <option key={z} value={z}>{z || 'All Zones'}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-forest-600 uppercase tracking-wide">Status</label>
          <select
            value={statusFilter}
            onChange={e => setStatus(e.target.value)}
            className="text-sm border border-forest-200 rounded-lg px-2 py-1.5 bg-white text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-300"
          >
            {STATUS_OPTIONS.map(s => (
              <option key={s} value={s}>{s ? s.charAt(0).toUpperCase() + s.slice(1) : 'All Statuses'}</option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-4 ml-auto">
          <label className="flex items-center gap-1.5 text-sm text-forest-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showParcels}
              onChange={e => setShowP(e.target.checked)}
              className="accent-forest-600"
            />
            Parcels
          </label>
          <label className="flex items-center gap-1.5 text-sm text-forest-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={showPending}
              onChange={e => setShowPend(e.target.checked)}
              className="accent-forest-600"
            />
            Pending Apps
          </label>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-3 text-sm">
          {error}
        </div>
      )}

      {/* Map + Legend */}
      <div className="flex gap-4 items-start">

        {/* Map container */}
        <div className="flex-1 bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden"
             style={{ height: 580 }}>
          <LiveMap
            parcels={parcels}
            pending={pending}
            showParcels={showParcels}
            showPending={showPending}
          />
        </div>

        {/* Legend sidebar */}
        <div className="w-44 shrink-0 space-y-5">
          {showParcels && (
            <div className="bg-white border border-forest-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-forest-600 uppercase tracking-wide mb-3">Parcels</p>
              <div className="space-y-2">
                {PARCEL_LEGEND.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-forest-700">
                    <span className="w-3 h-3 rounded-sm shrink-0 border border-black/10"
                          style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          {showPending && (
            <div className="bg-white border border-forest-100 rounded-xl p-4 shadow-sm">
              <p className="text-xs font-semibold text-forest-600 uppercase tracking-wide mb-3">Applications</p>
              <div className="space-y-2">
                {APP_LEGEND.map(({ color, label }) => (
                  <div key={label} className="flex items-center gap-2 text-xs text-forest-700">
                    <span className="w-3 h-3 rounded-full shrink-0 border border-black/10"
                          style={{ background: color }} />
                    {label}
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="bg-forest-50 border border-forest-200 rounded-xl p-4 text-xs text-forest-600 space-y-1">
            <p className="font-semibold">Tip</p>
            <p>Click any polygon or marker to see details. Use scroll to zoom.</p>
          </div>
        </div>
      </div>

      {/* Empty state when no geometry data */}
      {!loading && !error && parcelCount === 0 && pendingCount === 0 && (
        <div className="text-center py-8 text-forest-400 text-sm bg-white border border-forest-100 rounded-2xl">
          No parcels with geometry found. Add parcels with GeoJSON geometry to see them here.
        </div>
      )}
    </div>
  )
}
