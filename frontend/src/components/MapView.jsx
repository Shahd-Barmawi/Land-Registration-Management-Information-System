'use client'
import { useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Polygon } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

export default function MapView({ geometry, height = 260 }) {
  if (!geometry || geometry.type !== 'Polygon' || !geometry.coordinates?.length) {
    return (
      <div
        className="flex items-center justify-center rounded-xl border-2 border-dashed border-forest-200 bg-forest-50 text-sm text-forest-400"
        style={{ height }}
      >
        No parcel geometry available
      </div>
    )
  }

  // GeoJSON coordinates are [lng, lat]; Leaflet wants [lat, lng]
  const positions = geometry.coordinates[0].map(([lng, lat]) => [lat, lng])

  // Compute center for initial view
  const lats = positions.map(([lat]) => lat)
  const lngs = positions.map(([, lng]) => lng)
  const center = [
    (Math.min(...lats) + Math.max(...lats)) / 2,
    (Math.min(...lngs) + Math.max(...lngs)) / 2,
  ]

  return (
    <div className="rounded-xl overflow-hidden border-2 border-forest-200 shadow-inner" style={{ height }}>
      <MapContainer center={center} zoom={15} style={{ height: '100%', width: '100%' }} zoomControl={true}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        <Polygon
          positions={positions}
          pathOptions={{ color: '#4a7c59', fillColor: '#4a7c59', fillOpacity: 0.25, weight: 2 }}
        />
      </MapContainer>
    </div>
  )
}
