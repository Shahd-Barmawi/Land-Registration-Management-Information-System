'use client'
import { useState } from 'react'
import { MapContainer, TileLayer, Marker, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

const markerIcon = L.icon({
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
  iconSize:   [25, 41],
  iconAnchor: [12, 41],
})

function ClickHandler({ onPick }) {
  useMapEvents({ click: (e) => onPick(e.latlng) })
  return null
}

export default function MapPicker({ onGeometry }) {
  const [marker, setMarker] = useState(null)

  function handlePick(latlng) {
    setMarker(latlng)
    const d = 0.0008
    const { lat, lng } = latlng
    onGeometry({
      type: 'Polygon',
      coordinates: [[
        [lng - d, lat - d],
        [lng + d, lat - d],
        [lng + d, lat + d],
        [lng - d, lat + d],
        [lng - d, lat - d],
      ]],
    })
  }

  return (
    <div className="rounded-xl overflow-hidden border-2 border-forest-200 shadow-inner" style={{ height: 320 }}>
      <MapContainer
        center={[31.9, 35.2]}
        zoom={13}
        style={{ height: '100%', width: '100%' }}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='© OpenStreetMap contributors'
        />
        <ClickHandler onPick={handlePick} />
        {marker && <Marker position={marker} icon={markerIcon} />}
      </MapContainer>
    </div>
  )
}
