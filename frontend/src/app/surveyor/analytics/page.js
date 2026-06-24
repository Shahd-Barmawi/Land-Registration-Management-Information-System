'use client'
import { useState, useEffect } from 'react'
import {
  getAnalyticsKpis,
  getApplicationsByZone,
  getProcessingTime,
  getSurveyorsAnalytics,
  getRegistrarsAnalytics,
} from '@/lib/api'

// ── Colour maps ───────────────────────────────────────────────────────────────

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

const STATUS_BAR = {
  submitted:          'bg-sky-400',
  pre_checked:        'bg-blue-400',
  survey_required:    'bg-amber-400',
  surveyed:           'bg-teal-400',
  legal_review:       'bg-purple-400',
  approved:           'bg-forest-500',
  certificate_issued: 'bg-earth-500',
  rejected:           'bg-red-400',
  on_hold:            'bg-orange-400',
  missing_documents:  'bg-yellow-400',
  under_objection:    'bg-rose-400',
  closed:             'bg-gray-400',
}

// ── Sub-components ────────────────────────────────────────────────────────────

function KpiCard({ label, value, sub, color = 'text-forest-700' }) {
  return (
    <div className="bg-white border border-forest-100 rounded-2xl p-5 shadow-sm">
      <div className={`text-3xl font-bold mb-1 ${color}`}>{value ?? '—'}</div>
      <div className="text-sm font-semibold text-forest-800">{label}</div>
      {sub && <div className="text-xs text-forest-400 mt-0.5">{sub}</div>}
    </div>
  )
}

function Section({ title, children }) {
  return (
    <div className="bg-white border border-forest-100 rounded-2xl shadow-sm p-6">
      <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-5">{title}</h2>
      {children}
    </div>
  )
}

function BarRow({ label, count, total, colorCls }) {
  const pct = total > 0 ? Math.max(2, (count / total) * 100) : 2
  return (
    <div className="flex items-center gap-3">
      <span className={`text-xs px-2.5 py-1 rounded-full font-medium w-44 shrink-0 ${colorCls ?? 'bg-gray-100 text-gray-700'}`}>
        {label.replace(/_/g, ' ')}
      </span>
      <div className="flex-1 bg-forest-50 rounded-full h-2.5 overflow-hidden">
        <div className={`h-2.5 rounded-full ${STATUS_BAR[label] ?? 'bg-forest-400'}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-sm font-bold text-forest-800 w-8 text-right">{count}</span>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function AnalyticsDashboard() {
  const [kpis,       setKpis]       = useState(null)
  const [byZone,     setByZone]     = useState([])
  const [procTime,   setProcTime]   = useState(null)
  const [surveyors,  setSurveyors]  = useState([])
  const [registrars, setRegistrars] = useState([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)

  useEffect(() => {
    async function load() {
      try {
        const [k, z, p, s, r] = await Promise.all([
          getAnalyticsKpis(),
          getApplicationsByZone(),
          getProcessingTime(),
          getSurveyorsAnalytics(),
          getRegistrarsAnalytics(),
        ])
        setKpis(k)
        setByZone(z)
        setProcTime(p)
        setSurveyors(s)
        setRegistrars(r)
      } catch (e) {
        setError('Failed to load analytics. Is the backend running?')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  if (loading) return (
    <div className="flex items-center justify-center min-h-64 text-forest-400">Loading analytics…</div>
  )

  if (error) return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="bg-amber-50 border border-amber-200 text-amber-800 rounded-xl px-5 py-4 text-sm">{error}</div>
    </div>
  )

  const total = kpis?.total ?? 0
  const byStatus = kpis?.by_status ?? {}

  return (
    <div className="max-w-6xl mx-auto px-6 py-10 space-y-8">

      <div>
        <h1 className="text-2xl font-bold text-forest-900 mb-1">Analytics Dashboard</h1>
        <p className="text-forest-500 text-sm">Operational metrics across all land registration applications.</p>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <KpiCard label="Total Applications" value={total} color="text-forest-900" />
        <KpiCard label="Approved"           value={kpis?.approved}          color="text-forest-700" />
        <KpiCard label="Rejected"           value={kpis?.rejected}          color="text-red-600" />
        <KpiCard label="Certificates"       value={kpis?.total_certificates} color="text-earth-700" sub="issued" />
        <KpiCard label="Pending"            value={kpis?.pending}           color="text-amber-600" sub="active pipeline" />
        <KpiCard label="Under Objection"    value={kpis?.under_objection}   color="text-rose-600" />
        <KpiCard label="Avg. Processing"    value={kpis?.avg_processing_days != null ? `${kpis.avg_processing_days}d` : '—'} sub="days to approved" />
        <KpiCard label="Certificate Issued" value={kpis?.certificate_issued} color="text-teal-700" />
      </div>

      {/* By status */}
      {Object.keys(byStatus).length > 0 && (
        <Section title="Applications by Status">
          <div className="space-y-2">
            {Object.entries(byStatus).map(([s, count]) => (
              <BarRow key={s} label={s} count={count} total={total} colorCls={STATUS_COLORS[s]} />
            ))}
          </div>
        </Section>
      )}

      {/* By zone */}
      {byZone.length > 0 && (
        <Section title="Applications by Zone">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-forest-500 uppercase tracking-wide border-b border-forest-100">
                  <th className="text-left pb-2 pr-4">Zone</th>
                  <th className="text-right pb-2 px-3">Total</th>
                  <th className="text-right pb-2 px-3">Pending</th>
                  <th className="text-right pb-2 px-3">Approved</th>
                  <th className="text-right pb-2 px-3">Rejected</th>
                  <th className="pb-2 pl-3">Distribution</th>
                </tr>
              </thead>
              <tbody>
                {byZone.map((z) => (
                  <tr key={z.zone_id ?? 'unknown'} className="border-b border-forest-50 last:border-0">
                    <td className="py-2 pr-4 font-mono font-medium text-forest-800">{z.zone_id ?? '—'}</td>
                    <td className="py-2 px-3 text-right font-bold text-forest-900">{z.total}</td>
                    <td className="py-2 px-3 text-right text-amber-600">{z.pending}</td>
                    <td className="py-2 px-3 text-right text-forest-600">{z.approved}</td>
                    <td className="py-2 px-3 text-right text-red-500">{z.rejected}</td>
                    <td className="py-2 pl-3">
                      <div className="flex h-2 rounded-full overflow-hidden w-24">
                        {z.pending  > 0 && <div className="bg-amber-400"  style={{ width: `${(z.pending  / z.total) * 100}%` }} />}
                        {z.approved > 0 && <div className="bg-forest-500" style={{ width: `${(z.approved / z.total) * 100}%` }} />}
                        {z.rejected > 0 && <div className="bg-red-400"    style={{ width: `${(z.rejected / z.total) * 100}%` }} />}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* Processing time by type */}
        {procTime?.by_type?.length > 0 && (
          <Section title="Processing Time by Type">
            <div className="space-y-3">
              {procTime.by_type.map((t) => (
                <div key={t.application_type} className="flex items-center justify-between gap-2 text-sm">
                  <span className="text-forest-700 capitalize">{t.application_type?.replace(/_/g, ' ')}</span>
                  <div className="text-right shrink-0">
                    <span className="font-bold text-forest-900">{t.avg_days}d</span>
                    <span className="text-forest-400 text-xs ml-1">avg ({t.count} apps)</span>
                  </div>
                </div>
              ))}
            </div>
            {procTime.distribution_buckets?.length > 0 && (
              <div className="mt-5 pt-5 border-t border-forest-100">
                <p className="text-xs font-semibold text-forest-500 uppercase tracking-wide mb-3">Processing Time Distribution</p>
                <div className="space-y-2">
                  {procTime.distribution_buckets.map((b, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                      <span className="text-forest-500 w-24 shrink-0">{b.min_days}–{b.max_days}d</span>
                      <div className="flex-1 bg-forest-50 rounded-full h-2 overflow-hidden">
                        <div className="bg-earth-400 h-2 rounded-full" style={{ width: `${Math.max(5, (b.count / total) * 100)}%` }} />
                      </div>
                      <span className="font-bold text-forest-800 w-6 text-right">{b.count}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Section>
        )}

        {/* Surveyor workload */}
        {surveyors.length > 0 && (
          <Section title="Surveyor Workload">
            <div className="space-y-3">
              {surveyors.map((s) => {
                const utilPct = s.max_tasks > 0 ? Math.round((s.active_tasks / s.max_tasks) * 100) : 0
                return (
                  <div key={s.surveyor_id} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="font-mono font-medium text-forest-800">{s.staff_code ?? s.surveyor_id}</span>
                      <span className="text-forest-500 text-xs">{s.active_tasks}/{s.max_tasks ?? '?'} active</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-forest-50 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-2 rounded-full ${utilPct >= 80 ? 'bg-red-400' : utilPct >= 50 ? 'bg-amber-400' : 'bg-forest-400'}`}
                          style={{ width: `${Math.max(2, utilPct)}%` }}
                        />
                      </div>
                      <span className="text-xs text-forest-400 w-10 text-right">{utilPct}%</span>
                    </div>
                    <div className="text-xs text-forest-400">
                      {s.completed_tasks} completed · {s.total_tasks} total
                    </div>
                  </div>
                )
              })}
            </div>
          </Section>
        )}
      </div>

      {/* Registrar workload */}
      {registrars.length > 0 && (
        <Section title="Registrar Workload">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-forest-500 uppercase tracking-wide border-b border-forest-100">
                  <th className="text-left pb-2 pr-4">Registrar</th>
                  <th className="text-right pb-2 px-3">Total Actions</th>
                  <th className="text-right pb-2 px-3">Reviews</th>
                  <th className="text-right pb-2 px-3">Approvals</th>
                  <th className="text-right pb-2 px-3">Rejections</th>
                  <th className="text-right pb-2 pl-3">Pre-Checks</th>
                </tr>
              </thead>
              <tbody>
                {registrars.map((r) => (
                  <tr key={r.registrar_id} className="border-b border-forest-50 last:border-0">
                    <td className="py-2 pr-4 font-mono font-medium text-forest-800">{r.registrar_id}</td>
                    <td className="py-2 px-3 text-right font-bold text-forest-900">{r.total_actions}</td>
                    <td className="py-2 px-3 text-right text-purple-600">{r.reviews}</td>
                    <td className="py-2 px-3 text-right text-forest-600">{r.approvals}</td>
                    <td className="py-2 px-3 text-right text-red-500">{r.rejections}</td>
                    <td className="py-2 pl-3 text-right text-blue-500">{r.pre_checks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {!kpis && (
        <div className="text-center py-12 text-forest-400 text-sm">
          No analytics data yet — submit some applications to see metrics here.
        </div>
      )}
    </div>
  )
}
