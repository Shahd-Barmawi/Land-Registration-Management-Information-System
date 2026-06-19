'use client'
import { useState, useEffect } from 'react'
import { getAnalyticsSummary } from '@/lib/api'

function StatCard({ label, value, sub, color = 'text-forest-700' }) {
  return (
    <div className="bg-white border border-forest-100 rounded-xl p-5 shadow-sm">
      <div className={`text-3xl font-bold mb-1 ${color}`}>{value ?? '—'}</div>
      <div className="text-sm font-medium text-forest-800">{label}</div>
      {sub && <div className="text-xs text-forest-400 mt-0.5">{sub}</div>}
    </div>
  )
}

const STATUS_COLORS = {
  submitted:          'bg-sky-100    text-sky-800',
  pre_checked:        'bg-blue-100   text-blue-800',
  survey_required:    'bg-amber-100  text-amber-800',
  surveyed:           'bg-teal-100   text-teal-800',
  legal_review:       'bg-purple-100 text-purple-800',
  approved:           'bg-forest-100 text-forest-800',
  certificate_issued: 'bg-earth-100  text-earth-800',
  rejected:           'bg-red-100    text-red-800',
  on_hold:            'bg-orange-100 text-orange-800',
  missing_documents:  'bg-yellow-100 text-yellow-800',
  under_objection:    'bg-rose-100   text-rose-800',
  closed:             'bg-gray-100   text-gray-700',
}

export default function AnalyticsDashboard() {
  const [stats,   setStats]   = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const data = await getAnalyticsSummary()
        setStats(data)
      } catch {
        setError('Analytics endpoint not yet available.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-900 mb-1">Analytics Dashboard</h1>
      <p className="text-forest-500 text-sm mb-8">
        Operational metrics across all land registration applications.
      </p>

      {loading && <div className="text-center py-16 text-forest-400 text-sm">Loading analytics…</div>}
      {error   && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-4 text-sm mb-6">
          {error} The <code>/analytics/summary</code> endpoint will be implemented in Module 4.
        </div>
      )}

      {stats && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
            <StatCard label="Total Applications" value={stats.total}              color="text-forest-900" />
            <StatCard label="Approved"           value={stats.approved}           color="text-forest-700" />
            <StatCard label="Rejected"           value={stats.rejected}           color="text-red-600"    />
            <StatCard label="Avg. Processing"    value={stats.avg_processing_days ? `${stats.avg_processing_days}d` : '—'} sub="days to close" />
          </div>

          {stats.by_status && (
            <div className="bg-white border border-forest-100 rounded-2xl shadow-sm p-6">
              <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-4">By Status</h2>
              <div className="space-y-2">
                {Object.entries(stats.by_status).map(([s, count]) => (
                  <div key={s} className="flex items-center gap-3">
                    <span className={`text-xs px-2.5 py-1 rounded-full font-medium w-44 shrink-0 ${STATUS_COLORS[s] ?? 'bg-gray-100 text-gray-700'}`}>
                      {s.replace(/_/g, ' ')}
                    </span>
                    <div className="flex-1 bg-forest-50 rounded-full h-2 overflow-hidden">
                      <div
                        className="bg-forest-500 h-2 rounded-full"
                        style={{ width: `${Math.max(2, (count / stats.total) * 100)}%` }}
                      />
                    </div>
                    <span className="text-sm font-bold text-forest-800 w-8 text-right">{count}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {!loading && !stats && (
        <div className="text-center py-16 text-forest-400 text-sm">
          No analytics data yet. Data will appear once the analytics endpoint is implemented.
        </div>
      )}
    </div>
  )
}
