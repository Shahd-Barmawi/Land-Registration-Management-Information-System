'use client'
import dynamic from 'next/dynamic'
import { useState, useEffect } from 'react'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

export default function SurveyorMapPage() {
  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-900 mb-1">Live Parcel Map</h1>
      <p className="text-forest-500 text-sm mb-6">
        All registered parcels with stored geometry are shown below.
        Survey assignment overlays will be added once authentication is configured.
      </p>

      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="h-[540px]">
          {/* MapView currently renders a single parcel's geometry.
              This placeholder renders an empty map centred on Jordan.
              A full multi-parcel layer will be wired in Module 4. */}
          <MapView geometry={null} />
        </div>
      </div>

      <div className="mt-6 bg-forest-50 border border-forest-200 rounded-xl px-5 py-4 text-sm text-forest-700">
        <strong>Coming in Module 4:</strong> geospatial parcel clustering, survey assignment pins, and
        boundary overlap detection via the <code>/analytics/geospatial</code> endpoint.
      </div>
    </div>
  )
}
