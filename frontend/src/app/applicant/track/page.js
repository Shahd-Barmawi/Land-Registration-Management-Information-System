'use client'
import { useState } from 'react'
import Link from 'next/link'
import { getApplication, listApplications } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import ApplicationTimeline from '@/components/ApplicationTimeline'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

const PRIORITIES = ['low', 'normal', 'high', 'urgent']
const STATUSES = [
  'submitted', 'pre_checked', 'survey_required', 'surveyed',
  'legal_review', 'approved', 'certificate_issued', 'closed',
  'rejected', 'on_hold', 'missing_documents', 'under_objection',
]

function TrackById() {
  const [query,   setQuery]   = useState('')
  const [result,  setResult]  = useState(null)
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  async function search(e) {
    e.preventDefault()
    if (!query.trim()) return
    setLoading(true); setError(null); setResult(null)
    try {
      setResult(await getApplication(query.trim().toUpperCase()))
    } catch {
      setError('No application found with that ID.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <form onSubmit={search} className="flex gap-3 mb-6">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. LRMIS-2026-0001"
          className="flex-1 border-2 border-forest-200 rounded-xl px-4 py-3 text-forest-900 bg-white focus:outline-none focus:border-forest-500 font-mono text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-forest-700 hover:bg-forest-800 text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '…' : 'Search'}
        </button>
      </form>

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm">{error}</div>}

      {result && (
        <div className="space-y-5">
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-forest-800 text-white px-6 py-4 flex items-center justify-between">
              <div>
                <p className="font-mono text-sm text-forest-300">Application ID</p>
                <p className="font-bold text-lg">{result.application_id}</p>
              </div>
              <StatusBadge status={result.status} size="lg" />
            </div>
            <div className="px-6 py-5 grid grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div><p className="text-forest-400 text-xs">Type</p><p className="font-medium text-forest-800 capitalize">{result.application_type?.replace(/_/g,' ')}</p></div>
              <div><p className="text-forest-400 text-xs">Priority</p><p className="font-medium text-forest-800 capitalize">{result.priority}</p></div>
              <div><p className="text-forest-400 text-xs">Submitted</p><p className="font-medium text-forest-800">{fmt(result.timestamps?.submitted_at)}</p></div>
              <div><p className="text-forest-400 text-xs">Last Updated</p><p className="font-medium text-forest-800">{fmt(result.timestamps?.updated_at)}</p></div>
              <div><p className="text-forest-400 text-xs">Parcel</p><p className="font-medium text-forest-800">{result.parcel_ref?.parcel_number} / Block {result.parcel_ref?.block_number} / Zone {result.parcel_ref?.zone_id}</p></div>
              <div><p className="text-forest-400 text-xs">Next Steps</p><p className="font-medium text-forest-800">{result.workflow?.allowed_next?.join(', ') || '—'}</p></div>
            </div>
            {result.rejection_reason && <div className="border-t border-red-100 bg-red-50 px-6 py-3 text-sm text-red-700"><strong>Rejected:</strong> {result.rejection_reason}</div>}
            {result.hold_reason      && <div className="border-t border-orange-100 bg-orange-50 px-6 py-3 text-sm text-orange-700"><strong>On Hold:</strong> {result.hold_reason}</div>}
          </div>

          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
            <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-5">Status Timeline</p>
            <ApplicationTimeline application={result} />
          </div>

          <div className="text-center">
            <Link href={`/applicant/application/${result.application_id}`} className="text-sm text-forest-600 underline hover:text-forest-800">
              View full details →
            </Link>
          </div>
        </div>
      )}
    </div>
  )
}

function MyApplications() {
  const [applicantId, setApplicantId] = useState('')
  const [searched,    setSearched]    = useState(false)
  const [results,     setResults]     = useState(null)
  const [loading,     setLoading]     = useState(false)
  const [error,       setError]       = useState(null)

  const [priority,  setPriority]  = useState('')
  const [status,    setStatus]    = useState('')
  const [sortOrder, setSortOrder] = useState('-1')

  async function search(e) {
    e.preventDefault()
    if (!applicantId.trim()) return
    setLoading(true); setError(null)
    try {
      const data = await listApplications({
        applicant_id: applicantId.trim(),
        priority:     priority  || undefined,
        status:       status    || undefined,
        sort_order:   sortOrder,
        limit: 50,
      })
      setResults(data)
      setSearched(true)
    } catch {
      setError('Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }

  async function applyFilters() {
    if (!applicantId.trim()) return
    setLoading(true)
    try {
      const data = await listApplications({
        applicant_id: applicantId.trim(),
        priority:     priority  || undefined,
        status:       status    || undefined,
        sort_order:   sortOrder,
        limit: 50,
      })
      setResults(data)
    } catch {
      setError('Failed to load applications.')
    } finally {
      setLoading(false)
    }
  }

  const selectCls = 'border border-forest-200 rounded-lg px-3 py-2 text-sm text-forest-800 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400'

  return (
    <div>
      <form onSubmit={search} className="flex gap-3 mb-6">
        <input
          value={applicantId}
          onChange={(e) => setApplicantId(e.target.value)}
          placeholder="Enter your National ID / Applicant ID"
          className="flex-1 border-2 border-forest-200 rounded-xl px-4 py-3 text-forest-900 bg-white focus:outline-none focus:border-forest-500 text-sm"
        />
        <button
          type="submit"
          disabled={loading}
          className="bg-forest-700 hover:bg-forest-800 text-white px-6 py-3 rounded-xl font-semibold text-sm disabled:opacity-50 transition-colors"
        >
          {loading ? '…' : 'Load'}
        </button>
      </form>

      {searched && (
        <div className="flex flex-wrap gap-3 mb-6 p-4 bg-parchment border border-earth-200 rounded-xl">
          <div>
            <label className="block text-xs text-forest-500 mb-1">Priority</label>
            <select className={selectCls} value={priority} onChange={(e) => { setPriority(e.target.value) }}>
              <option value="">All priorities</option>
              {PRIORITIES.map((p) => <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1">Status</label>
            <select className={selectCls} value={status} onChange={(e) => { setStatus(e.target.value) }}>
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{s.replace(/_/g,' ')}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs text-forest-500 mb-1">Sort</label>
            <select className={selectCls} value={sortOrder} onChange={(e) => { setSortOrder(e.target.value) }}>
              <option value="-1">Newest first</option>
              <option value="1">Oldest first</option>
            </select>
          </div>
          <div className="flex items-end">
            <button
              onClick={applyFilters}
              disabled={loading}
              className="bg-forest-600 hover:bg-forest-700 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
            >
              Apply
            </button>
          </div>
        </div>
      )}

      {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm mb-4">{error}</div>}

      {results && (
        <>
          <p className="text-xs text-forest-400 mb-3">{results.total} application(s) found</p>

          {results.data.length === 0 ? (
            <div className="text-center py-12 text-forest-400 text-sm">No applications found for this ID.</div>
          ) : (
            <div className="space-y-3">
              {results.data.map((app) => (
                <Link
                  key={app.application_id}
                  href={`/applicant/application/${app.application_id}`}
                  className="block bg-white border border-forest-100 rounded-xl shadow-sm hover:shadow-md hover:border-forest-300 transition-all px-5 py-4"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-1">
                        <span className="font-mono text-sm font-bold text-forest-800">{app.application_id}</span>
                        <StatusBadge status={app.status} size="md" />
                      </div>
                      <p className="text-sm text-forest-600 capitalize">{app.application_type?.replace(/_/g,' ')}</p>
                      <p className="text-xs text-forest-400 mt-1">
                        Parcel {app.parcel_ref?.parcel_number} · Block {app.parcel_ref?.block_number} · {app.parcel_ref?.zone_id}
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
        </>
      )}
    </div>
  )
}

export default function TrackPage() {
  const [tab, setTab] = useState('history')

  const tabCls = (t) =>
    `px-5 py-2.5 text-sm font-semibold rounded-lg transition-colors ${
      tab === t
        ? 'bg-forest-700 text-white'
        : 'text-forest-600 hover:bg-forest-100'
    }`

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-800 mb-1">Track Applications</h1>
      <p className="text-forest-500 text-sm mb-6">View your application history or look up a specific application.</p>

      <div className="flex gap-2 mb-8 bg-forest-50 border border-forest-100 rounded-xl p-1 w-fit">
        <button className={tabCls('history')} onClick={() => setTab('history')}>My Applications</button>
        <button className={tabCls('single')}  onClick={() => setTab('single')}>Track by ID</button>
      </div>

      {tab === 'history' ? <MyApplications /> : <TrackById />}
    </div>
  )
}
