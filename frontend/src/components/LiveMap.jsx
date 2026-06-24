'use client'
import { useEffect } from 'react'
import { MapContainer, TileLayer, Polygon, CircleMarker, Popup, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'

// ── Colour helpers ────────────────────────────────────────────────────────────

const PARCEL_STATUS_COLOR = {
  registered:   '#2d6a4f',   // forest green
  unregistered: '#d4a017',   // earth yellow
  disputed:     '#c62828',   // red
  pending:      '#f57c00',   // orange
}

const APP_STATUS_COLOR = {
  submitted:       '#0288d1',
  pre_checked:     '#1565c0',
  survey_required: '#f57c00',
  surveyed:        '#00796b',
  legal_review:    '#7b1fa2',
  on_hold:         '#e65100',
  missing_documents: '#f9a825',
  under_objection: '#c62828',
}

const PRIORITY_COLOR = {
  urgent: '#c62828',
  high:   '#e65100',
  normal: '#1565c0',
  low:    '#555',
}

// Convert GeoJSON Polygon coordinates → Leaflet [lat, lng] array
function geoToLeaflet(coords) {
  if (!coords || !coords[0]) return []
  return coords[0].map(([lng, lat]) => [lat, lng])
}

// Centroid of a polygon ring (for placing markers)
function centroid(coords) {
  if (!coords || !coords[0] || !coords[0].length) return [31.9, 35.2]
  const ring = coords[0]
  const n = ring.length
  let lat = 0, lng = 0
  ring.forEach(([lo, la]) => { lat += la; lng += lo })
  return [lat / n, lng / n]
}

// ── Fit-bounds helper ─────────────────────────────────────────────────────────

function FitBounds({ features }) {
  const map = useMap()
  useEffect(() => {
    if (!features || features.length === 0) return
    const pts = []
    features.forEach(f => {
      const coords = f.geometry?.coordinates
      if (coords?.[0]) coords[0].forEach(([lo, la]) => pts.push([la, lo]))
    })
    if (pts.length > 0) {
      try { map.fitBounds(pts, { padding: [30, 30] }) } catch {}
    }
  }, [features, map])
  return null
}

// ── Main component ────────────────────────────────────────────────────────────

export default function LiveMap({ parcels = [], pending = [], showParcels = true, showPending = true }) {
  const parcelFeatures = parcels?.features ?? []
  const pendingFeatures = pending?.features ?? []

  return (
    <MapContainer
      center={[31.9, 35.2]}
      zoom={11}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="© OpenStreetMap contributors"
      />

      {/* Fit bounds to parcel data */}
      {parcelFeatures.length > 0 && <FitBounds features={parcelFeatures} />}

      {/* Parcel polygons */}
      {showParcels && parcelFeatures.map((f, i) => {
        const coords = f.geometry?.coordinates
        if (!coords) return null
        const pts = geoToLeaflet(coords)
        if (pts.length === 0) return null
        const color = PARCEL_STATUS_COLOR[f.properties?.registration_status] ?? '#2d6a4f'
        return (
          <Polygon
            key={`parcel-${i}`}
            positions={pts}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.25, weight: 2 }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">{f.properties?.parcel_code ?? 'Parcel'}</p>
                <p>Zone: {f.properties?.zone_id ?? '—'}</p>
                <p>Status: {f.properties?.registration_status ?? '—'}</p>
                {f.properties?.land_use && <p>Use: {f.properties.land_use}</p>}
                {f.properties?.area_sqm && <p>Area: {f.properties.area_sqm} m²</p>}
                {f.properties?.dispute_state && f.properties.dispute_state !== 'none' && (
                  <p className="text-red-600 font-semibold">Dispute: {f.properties.dispute_state}</p>
                )}
              </div>
            </Popup>
          </Polygon>
        )
      })}

      {/* Pending application markers */}
      {showPending && pendingFeatures.map((f, i) => {
        const coords = f.geometry?.coordinates
        if (!coords) return null
        const center = centroid(coords)
        const color = APP_STATUS_COLOR[f.properties?.status] ?? PRIORITY_COLOR[f.properties?.priority] ?? '#1565c0'
        return (
          <CircleMarker
            key={`pending-${i}`}
            center={center}
            radius={8}
            pathOptions={{ color, fillColor: color, fillOpacity: 0.8, weight: 2 }}
          >
            <Popup>
              <div className="text-xs space-y-1">
                <p className="font-bold text-sm">{f.properties?.application_id}</p>
                <p>Status: <span className="capitalize">{f.properties?.status?.replace(/_/g, ' ')}</span></p>
                <p>Priority: <span className="capitalize">{f.properties?.priority}</span></p>
                <p>Zone: {f.properties?.zone_id}</p>
                <p>Type: <span className="capitalize">{f.properties?.application_type?.replace(/_/g, ' ')}</span></p>
              </div>
            </Popup>
          </CircleMarker>
        )
      })}
    </MapContainer>
  )
}
