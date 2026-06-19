'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getApplication } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

export default function SurveyorTaskPage() {
  const { id }    = useParams()
  const [app,     setApp]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    if (!id) return
    getApplication(id)
      .then(setApp)
      .catch(() => setError('Task / application not found'))
      .finally(() => setLoading(false))
  }, [id])

  if (loading) return <div className="flex items-center justify-center min-h-64 text-forest-400">Loading task…</div>
  if (error)   return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
      <Link href="/surveyor" className="text-forest-600 underline text-sm">← Back to Tasks</Link>
    </div>
  )
  if (!app) return null

  const parcel = app.parcel_ref ?? {}
  const geometry = app.parcel_ref?.geometry ?? null

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

      <nav className="text-sm text-forest-400">
        <Link href="/surveyor" className="hover:text-forest-700">My Tasks</Link>
        <span className="mx-2">›</span>
        <span className="text-forest-700 font-medium">{app.application_id}</span>
      </nav>

      {/* Header */}
      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-forest-900 text-white px-6 py-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-forest-400 text-xs font-mono mb-1">SURVEY TASK</p>
            <p className="text-xl font-bold font-mono">{app.application_id}</p>
            <p className="text-forest-200 text-sm mt-1 capitalize">{app.application_type?.replace(/_/g, ' ')}</p>
          </div>
          <StatusBadge status={app.status} size="lg" />
        </div>

        <div className="px-6 py-5 text-sm">
          <div className="grid grid-cols-2 gap-4">
            <div><p className="text-xs text-forest-400">Parcel</p><p className="font-medium text-forest-800">{parcel.parcel_number} / Block {parcel.block_number}</p></div>
            <div><p className="text-xs text-forest-400">Zone</p><p className="font-medium text-forest-800">{parcel.zone_id}</p></div>
            <div><p className="text-xs text-forest-400">Basin</p><p className="font-medium text-forest-800">{parcel.basin_number}</p></div>
            <div><p className="text-xs text-forest-400">Submitted</p><p className="font-medium text-forest-800">{fmt(app.timestamps?.submitted_at)}</p></div>
          </div>
        </div>
      </div>

      {/* Map */}
      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-forest-100">
          <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide">Parcel Location</p>
        </div>
        <div className="h-80">
          <MapView geometry={geometry} />
        </div>
      </div>

      {/* Survey report upload placeholder */}
      <div className="bg-parchment border border-earth-200 rounded-2xl px-6 py-5">
        <p className="text-sm font-semibold text-earth-800 mb-2">Submit Survey Report</p>
        <p className="text-sm text-earth-600">
          Survey report submission and field note upload will be available here once authentication
          and surveyor assignment are implemented.
        </p>
      </div>
    </div>
  )
}
