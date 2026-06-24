'use client'
import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { listApplications } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

const PRIORITY_CLS = {
  urgent: 'bg-red-100 text-red-700 border-red-200',
  high:   'bg-orange-100 text-orange-700 border-orange-200',
  normal: 'bg-blue-100 text-blue-700 border-blue-200',
  low:    'bg-gray-100 text-gray-600 border-gray-200',
}

const MILESTONE_LABEL = {
  assigned:          'Assigned',
  visit_scheduled:   'Visit Scheduled',
  arrived_on_site:   'Arrived on Site',
  survey_started:    'Survey Started',
  survey_completed:  'Survey Completed',
  report_uploaded:   'Report Uploaded',
  registrar_reviewed:'Reviewed',
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SurveyorTasksPage() {
  const [apps,      setApps]      = useState([])
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState(null)
  const [zone,      setZone]      = useState('')
  const [priority,  setPriority]  = useState('')
  const [statusFilter, setStatus] = useState('survey_required')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const params = { limit: 50 }
      if (statusFilter) params.status = statusFilter
      if (zone)         params.zone_id = zone
      if (priority)     params.priority = priority
      const res = await listApplications(params)
      setApps(res.data ?? [])
    } catch {
      setError('Failed to load tasks')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, zone, priority])

  useEffect(() => { load() }, [load])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">My Survey Tasks</h1>
          <p className="text-sm text-forest-500 mt-1">Field survey assignments requiring action</p>
        </div>
        <span className="text-sm text-forest-400 font-medium">{apps.length} task{apps.length !== 1 ? 's' : ''}</span>
      </div>

      {/* Filters */}
      <div className="bg-white border border-forest-100 rounded-2xl px-5 py-4 flex flex-wrap gap-3">
        <select
          value={statusFilter}
          onChange={e => setStatus(e.target.value)}
          className="text-sm border border-forest-200 rounded-lg px-3 py-2 text-forest-700 bg-white"
        >
          <option value="">All survey statuses</option>
          <option value="survey_required">Survey Required</option>
          <option value="surveyed">Surveyed</option>
          <option value="legal_review">Legal Review</option>
        </select>

        <select
          value={priority}
          onChange={e => setPriority(e.target.value)}
          className="text-sm border border-forest-200 rounded-lg px-3 py-2 text-forest-700 bg-white"
        >
          <option value="">All priorities</option>
          <option value="urgent">Urgent</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>

        <input
          type="text"
          value={zone}
          onChange={e => setZone(e.target.value)}
          placeholder="Filter by zone…"
          className="text-sm border border-forest-200 rounded-lg px-3 py-2 text-forest-700 bg-white"
        />

        <button
          onClick={load}
          className="text-sm bg-forest-700 text-white px-4 py-2 rounded-lg hover:bg-forest-800 transition-colors"
        >
          Apply
        </button>
      </div>

      {/* Task list */}
      {loading && (
        <div className="text-center py-16 text-forest-400">Loading tasks…</div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>
      )}

      {!loading && !error && apps.length === 0 && (
        <div className="text-center py-16 text-forest-400">
          <p className="text-lg font-medium">No tasks found</p>
          <p className="text-sm mt-1">Try changing the filters above</p>
        </div>
      )}

      {!loading && !error && apps.length > 0 && (
        <div className="space-y-3">
          {apps.map(app => {
            const parcel = app.parcel_ref ?? {}
            const submitted = fmt(app.timestamps?.submitted_at)
            const surveyorCode = app.assignment?.assigned_surveyor_code

            return (
              <Link
                key={app.id}
                href={`/surveyor/tasks/${app.application_id}`}
                className="block bg-white border border-forest-100 rounded-2xl shadow-sm hover:shadow-md hover:border-forest-300 transition-all overflow-hidden"
              >
                <div className="px-5 py-4 flex flex-wrap items-center gap-4">
                  {/* Application ID + type */}
                  <div className="flex-1 min-w-0">
                    <p className="font-mono font-semibold text-forest-800 text-sm">{app.application_id}</p>
                    <p className="text-xs text-forest-500 mt-0.5 capitalize">{app.application_type?.replace(/_/g, ' ')}</p>
                  </div>

                  {/* Parcel */}
                  <div className="hidden sm:block text-sm text-forest-700 min-w-[120px]">
                    <p className="text-xs text-forest-400">Parcel / Block</p>
                    <p className="font-medium">{parcel.parcel_number} / {parcel.block_number}</p>
                  </div>

                  {/* Zone */}
                  <div className="hidden md:block text-sm text-forest-700 min-w-[100px]">
                    <p className="text-xs text-forest-400">Zone</p>
                    <p className="font-medium">{parcel.zone_id ?? '—'}</p>
                  </div>

                  {/* Surveyor assigned */}
                  <div className="hidden lg:block text-sm text-forest-700 min-w-[110px]">
                    <p className="text-xs text-forest-400">Surveyor</p>
                    <p className="font-medium font-mono">{surveyorCode ?? <span className="text-orange-500 italic">Unassigned</span>}</p>
                  </div>

                  {/* Submitted */}
                  <div className="hidden lg:block text-sm text-forest-700 min-w-[100px]">
                    <p className="text-xs text-forest-400">Submitted</p>
                    <p className="font-medium">{submitted}</p>
                  </div>

                  {/* Priority */}
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${PRIORITY_CLS[app.priority] ?? PRIORITY_CLS.normal}`}>
                    {app.priority}
                  </span>

                  {/* Status */}
                  <StatusBadge status={app.status} />

                  {/* Arrow */}
                  <span className="text-forest-300 text-lg">›</span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
