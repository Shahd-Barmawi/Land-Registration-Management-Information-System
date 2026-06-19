'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { listApplications } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const STATUSES = [
  'submitted', 'pre_checked', 'survey_required', 'surveyed',
  'legal_review', 'approved', 'certificate_issued', 'closed',
  'rejected', 'on_hold', 'missing_documents', 'under_objection',
]
const PRIORITIES = ['low', 'normal', 'high', 'urgent']

const selectCls = 'border border-forest-200 rounded-lg px-3 py-2 text-sm text-forest-800 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400'

export default function StaffApplicationsPage() {
  const [apps,     setApps]     = useState(null)
  const [loading,  setLoading]  = useState(true)
  const [error,    setError]    = useState(null)

  // Read initial status from URL query string (?status=submitted etc.)
  const [status,    setStatus]    = useState(() => {
    if (typeof window !== 'undefined') {
      return new URLSearchParams(window.location.search).get('status') || ''
    }
    return ''
  })
  const [priority,  setPriority]  = useState('')
  const [sortOrder, setSortOrder] = useState('-1')

  async function load() {
    setLoading(true); setError(null)
    try {
      const data = await listApplications({
        status:     status   || undefined,
        priority:   priority || undefined,
        sort_order: sortOrder,
        limit: 100,
      })
      setApps(data)
    } catch {
      setError('Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [status, priority, sortOrder])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-forest-900">All Applications</h1>
          {apps && <p className="text-sm text-forest-400 mt-0.5">{apps.total} total</p>}
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-6 p-4 bg-parchment border border-earth-200 rounded-xl">
        <div>
          <label className="block text-xs text-forest-500 mb-1">Status</label>
          <select className={selectCls} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-forest-500 mb-1">Priority</label>
          <select className={selectCls} value={priority} onChange={(e) => setPriority(e.target.value)}>
            <option value="">All priorities</option>
            {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-xs text-forest-500 mb-1">Sort</label>
          <select className={selectCls} value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="-1">Newest first</option>
            <option value="1">Oldest first</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={load}
            disabled={loading}
            className="bg-earth-600 hover:bg-earth-700 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
          >
            {loading ? '…' : 'Apply'}
          </button>
        </div>
      </div>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm mb-4">{error}</div>}

      {loading && !apps && (
        <div className="text-center py-16 text-forest-400 text-sm">Loading…</div>
      )}

      {apps?.data.length === 0 && (
        <div className="text-center py-16 text-forest-400 text-sm">No applications match the current filters.</div>
      )}

      {apps?.data.length > 0 && (
        <div className="space-y-3">
          {apps.data.map((app) => (
            <Link
              key={app.application_id}
              href={`/staff/application/${app.application_id}`}
              className="block bg-white border border-forest-100 rounded-xl shadow-sm hover:shadow-md hover:border-earth-300 transition-all px-5 py-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-1">
                    <span className="font-mono text-sm font-bold text-forest-800">{app.application_id}</span>
                    <StatusBadge status={app.status} size="md" />
                  </div>
                  <p className="text-sm text-forest-600 capitalize">{app.application_type?.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-forest-400 mt-1">
                    Applicant: {app.applicant_ref?.applicant_id} · Parcel {app.parcel_ref?.parcel_number} · Block {app.parcel_ref?.block_number}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-forest-400">{fmt(app.timestamps?.submitted_at)}</p>
                  <span className={`text-xs font-medium mt-1 inline-block px-2 py-0.5 rounded-full ${
                    app.priority === 'urgent' ? 'bg-red-100 text-red-700' :
                    app.priority === 'high'   ? 'bg-orange-100 text-orange-700' :
                    app.priority === 'normal' ? 'bg-forest-100 text-forest-700' :
                                                'bg-gray-100 text-gray-600'
                  }`}>{app.priority}</span>
                </div>
              </div>
              {app.rejection_reason && <p className="text-xs text-red-600 mt-2">Rejected: {app.rejection_reason}</p>}
              {app.hold_reason      && <p className="text-xs text-orange-600 mt-2">On hold: {app.hold_reason}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
