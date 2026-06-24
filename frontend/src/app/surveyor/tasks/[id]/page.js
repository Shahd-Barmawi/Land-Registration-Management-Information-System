'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import {
  getApplication,
  getSurveyTask,
  updateSurveyMilestone,
  submitSurveyReport,
} from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

// ── Constants ─────────────────────────────────────────────────────────────────

const MILESTONES = [
  { key: 'assigned',          label: 'Assigned',          icon: '📋' },
  { key: 'visit_scheduled',   label: 'Visit Scheduled',   icon: '📅' },
  { key: 'arrived_on_site',   label: 'Arrived on Site',   icon: '📍' },
  { key: 'survey_started',    label: 'Survey Started',    icon: '🔭' },
  { key: 'survey_completed',  label: 'Survey Completed',  icon: '✅' },
  { key: 'report_uploaded',   label: 'Report Uploaded',   icon: '📄' },
  { key: 'registrar_reviewed',label: 'Registrar Reviewed',icon: '🏛️' },
]
const MILESTONE_ORDER = Object.fromEntries(MILESTONES.map((m, i) => [m.key, i]))

// Next milestone the surveyor can trigger (excludes 'assigned' and 'registrar_reviewed')
const NEXT_MILESTONE = {
  assigned:         'visit_scheduled',
  visit_scheduled:  'arrived_on_site',
  arrived_on_site:  'survey_started',
  survey_started:   'survey_completed',
  survey_completed: 'report_uploaded',
}

const MILESTONE_BTN_LABEL = {
  visit_scheduled:  'Mark Visit Scheduled',
  arrived_on_site:  'Mark Arrived on Site',
  survey_started:   'Start Survey',
  survey_completed: 'Complete Survey',
  report_uploaded:  'Submit Report',
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MilestoneTracker({ currentStatus }) {
  const currentIdx = MILESTONE_ORDER[currentStatus] ?? 0
  return (
    <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
      <p className="text-xs font-semibold text-forest-500 uppercase tracking-wide mb-4">Survey Progress</p>
      <ol className="space-y-3">
        {MILESTONES.map((m, i) => {
          const done    = i < currentIdx
          const current = i === currentIdx
          const pending = i > currentIdx
          return (
            <li key={m.key} className="flex items-center gap-3">
              <span className={`w-7 h-7 rounded-full flex items-center justify-center text-sm font-bold flex-shrink-0
                ${done    ? 'bg-forest-600 text-white' : ''}
                ${current ? 'bg-earth-500 text-white ring-2 ring-earth-300' : ''}
                ${pending ? 'bg-forest-100 text-forest-400' : ''}
              `}>
                {done ? '✓' : i + 1}
              </span>
              <span className={`text-sm ${done ? 'text-forest-600 line-through' : current ? 'text-earth-700 font-semibold' : 'text-forest-400'}`}>
                {m.icon} {m.label}
              </span>
            </li>
          )
        })}
      </ol>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function SurveyorTaskPage() {
  const { id } = useParams()

  const [app,          setApp]          = useState(null)
  const [task,         setTask]         = useState(null)
  const [loading,      setLoading]      = useState(true)
  const [error,        setError]        = useState(null)

  // Milestone action
  const [milestoneNote, setMilestoneNote] = useState('')
  const [scheduledDate, setScheduledDate] = useState('')
  const [actionLoading, setActionLoading] = useState(false)
  const [actionError,   setActionError]   = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Field notes
  const [fieldNote,      setFieldNote]      = useState('')
  const [fieldNoteLoading, setFieldNoteLoading] = useState(false)

  // Survey report form
  const [showReport,     setShowReport]     = useState(false)
  const [reportSurveyor, setReportSurveyor] = useState('')
  const [reportSummary,  setReportSummary]  = useState('')
  const [reportFindings, setReportFindings] = useState('')
  const [reportNotes,    setReportNotes]    = useState('')
  const [reportLoading,  setReportLoading]  = useState(false)
  const [reportSuccess,  setReportSuccess]  = useState(false)

  const loadData = useCallback(async () => {
    if (!id) return
    setLoading(true)
    setError(null)
    try {
      const [appData, taskData] = await Promise.allSettled([
        getApplication(id),
        getSurveyTask(id),
      ])
      if (appData.status === 'fulfilled')  setApp(appData.value)
      else setError('Application not found')
      if (taskData.status === 'fulfilled') setTask(taskData.value)
    } catch {
      setError('Failed to load task')
    } finally {
      setLoading(false)
    }
  }, [id])

  useEffect(() => { loadData() }, [loadData])

  function flash(msg) {
    setActionSuccess(msg)
    setTimeout(() => setActionSuccess(null), 4000)
  }

  async function handleMilestone(milestone) {
    setActionLoading(true)
    setActionError(null)
    try {
      const meta = {}
      if (milestone === 'visit_scheduled' && scheduledDate) meta.scheduled_date = scheduledDate
      const updated = await updateSurveyMilestone(id, {
        milestone,
        notes: milestoneNote || undefined,
        actor_id: 'surveyor',
        meta: Object.keys(meta).length ? meta : undefined,
      })
      setTask(updated)
      setMilestoneNote('')
      setScheduledDate('')
      flash(`Milestone "${milestone.replace(/_/g, ' ')}" recorded`)
      // Refresh application state too
      const appData = await getApplication(id)
      setApp(appData)
    } catch (err) {
      setActionError(err?.detail ?? 'Failed to update milestone')
    } finally {
      setActionLoading(false)
    }
  }

  async function handleAddFieldNote() {
    if (!fieldNote.trim()) return
    setFieldNoteLoading(true)
    try {
      const updated = await updateSurveyMilestone(id, {
        milestone: task?.status ?? 'assigned',
        notes: `FIELD NOTE: ${fieldNote}`,
        actor_id: 'surveyor',
      })
      setTask(updated)
      setFieldNote('')
      flash('Field note saved')
    } catch {
      // silently ignore — milestone might already be at that level
    } finally {
      setFieldNoteLoading(false)
    }
  }

  async function handleSubmitReport(e) {
    e.preventDefault()
    if (!reportSurveyor.trim()) return
    setReportLoading(true)
    setActionError(null)
    try {
      await submitSurveyReport(id, {
        surveyor_id: reportSurveyor,
        report_summary: reportSummary || undefined,
        findings: reportFindings || undefined,
        field_notes: reportNotes || undefined,
      })
      setReportSuccess(true)
      setShowReport(false)
      flash('Survey report submitted successfully')
      await loadData()
    } catch (err) {
      setActionError(err?.detail ?? 'Failed to submit report')
    } finally {
      setReportLoading(false)
    }
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (loading) return (
    <div className="flex items-center justify-center min-h-64 text-forest-400">Loading task…</div>
  )
  if (error) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
      <Link href="/surveyor/tasks" className="text-forest-600 underline text-sm">← Back to Tasks</Link>
    </div>
  )
  if (!app) return null

  const parcel      = app.parcel_ref ?? {}
  const geometry    = parcel.geometry ?? null
  const taskStatus  = task?.status ?? 'assigned'
  const nextMilestone = NEXT_MILESTONE[taskStatus]
  const isComplete  = taskStatus === 'report_uploaded' || taskStatus === 'registrar_reviewed'

  return (
    <div className="max-w-5xl mx-auto px-6 py-10 space-y-6">

      {/* Breadcrumb */}
      <nav className="text-sm text-forest-400">
        <Link href="/surveyor/tasks" className="hover:text-forest-700">My Tasks</Link>
        <span className="mx-2">›</span>
        <span className="text-forest-700 font-medium">{app.application_id}</span>
      </nav>

      {/* Success / Error banners */}
      {actionSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 rounded-xl px-5 py-3 text-sm font-medium">
          {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm">
          {actionError}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left column ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header card */}
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-forest-900 text-white px-6 py-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-forest-400 text-xs font-mono mb-1">SURVEY TASK</p>
                <p className="text-xl font-bold font-mono">{app.application_id}</p>
                <p className="text-forest-200 text-sm mt-1 capitalize">{app.application_type?.replace(/_/g, ' ')}</p>
                {task && (
                  <p className="text-forest-400 text-xs font-mono mt-1">{task.task_id}</p>
                )}
              </div>
              <StatusBadge status={app.status} size="lg" />
            </div>

            <div className="px-6 py-5">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                <div>
                  <p className="text-xs text-forest-400">Parcel / Block</p>
                  <p className="font-medium text-forest-800">{parcel.parcel_number} / {parcel.block_number}</p>
                </div>
                <div>
                  <p className="text-xs text-forest-400">Zone</p>
                  <p className="font-medium text-forest-800">{parcel.zone_id ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-forest-400">Basin</p>
                  <p className="font-medium text-forest-800">{parcel.basin_number ?? '—'}</p>
                </div>
                <div>
                  <p className="text-xs text-forest-400">Priority</p>
                  <p className="font-medium text-forest-800 capitalize">{app.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-forest-400">Submitted</p>
                  <p className="font-medium text-forest-800">{fmt(app.timestamps?.submitted_at)}</p>
                </div>
                <div>
                  <p className="text-xs text-forest-400">Survey Required</p>
                  <p className="font-medium text-forest-800">{fmt(app.timestamps?.survey_required_at)}</p>
                </div>
                {app.assignment?.assigned_surveyor_code && (
                  <div>
                    <p className="text-xs text-forest-400">Assigned Surveyor</p>
                    <p className="font-medium text-forest-800 font-mono">{app.assignment.assigned_surveyor_code}</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Map */}
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b border-forest-100">
              <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide">Parcel Location</p>
            </div>
            <div className="h-72">
              <MapView geometry={geometry} />
            </div>
          </div>

          {/* Milestone history */}
          {task?.milestones?.length > 0 && (
            <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
              <p className="text-xs font-semibold text-forest-500 uppercase tracking-wide mb-4">Milestone History</p>
              <ol className="space-y-3">
                {[...task.milestones].reverse().map((m, i) => (
                  <li key={i} className="flex gap-3 text-sm">
                    <span className="w-2 h-2 mt-1.5 rounded-full bg-forest-400 flex-shrink-0" />
                    <div>
                      <span className="font-semibold text-forest-800 capitalize">{m.type?.replace(/_/g, ' ')}</span>
                      <span className="text-forest-400 ml-2 text-xs">{fmt(m.at)}</span>
                      {m.by && m.by !== 'system' && (
                        <span className="text-forest-400 ml-2 text-xs">by {m.by}</span>
                      )}
                      {m.meta?.notes && (
                        <p className="text-forest-500 text-xs mt-0.5 italic">{m.meta.notes}</p>
                      )}
                      {m.meta?.scheduled_date && (
                        <p className="text-forest-500 text-xs mt-0.5">Scheduled: {m.meta.scheduled_date}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Field notes */}
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
            <p className="text-xs font-semibold text-forest-500 uppercase tracking-wide mb-3">Add Field Note</p>
            <textarea
              value={fieldNote}
              onChange={e => setFieldNote(e.target.value)}
              rows={3}
              placeholder="Record observations, conditions, or issues…"
              className="w-full border border-forest-200 rounded-lg px-3 py-2 text-sm text-forest-800 resize-none focus:outline-none focus:ring-2 focus:ring-forest-400"
            />
            <button
              onClick={handleAddFieldNote}
              disabled={!fieldNote.trim() || fieldNoteLoading}
              className="mt-2 text-sm bg-forest-700 text-white px-4 py-2 rounded-lg hover:bg-forest-800 disabled:opacity-40 transition-colors"
            >
              {fieldNoteLoading ? 'Saving…' : 'Save Note'}
            </button>
          </div>
        </div>

        {/* ── Right column (sticky) ── */}
        <div className="space-y-4 lg:sticky lg:top-6 lg:self-start">

          {/* Milestone tracker */}
          <MilestoneTracker currentStatus={taskStatus} />

          {/* Next action panel */}
          {!isComplete && nextMilestone && (
            <div className="bg-white border border-earth-200 rounded-2xl shadow-sm px-5 py-5 space-y-4">
              <p className="text-xs font-semibold text-earth-600 uppercase tracking-wide">Next Action</p>

              {nextMilestone === 'visit_scheduled' && (
                <div>
                  <label className="block text-xs text-forest-500 mb-1">Scheduled Date (optional)</label>
                  <input
                    type="date"
                    value={scheduledDate}
                    onChange={e => setScheduledDate(e.target.value)}
                    className="w-full border border-forest-200 rounded-lg px-3 py-2 text-sm text-forest-800 focus:outline-none focus:ring-2 focus:ring-forest-400"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs text-forest-500 mb-1">Notes (optional)</label>
                <textarea
                  value={milestoneNote}
                  onChange={e => setMilestoneNote(e.target.value)}
                  rows={2}
                  placeholder="Add a note for this milestone…"
                  className="w-full border border-forest-200 rounded-lg px-3 py-2 text-sm text-forest-800 resize-none focus:outline-none focus:ring-2 focus:ring-forest-400"
                />
              </div>

              <button
                onClick={() => handleMilestone(nextMilestone)}
                disabled={actionLoading}
                className="w-full bg-earth-600 hover:bg-earth-700 text-white text-sm font-semibold py-2.5 rounded-xl transition-colors disabled:opacity-50"
              >
                {actionLoading ? 'Updating…' : MILESTONE_BTN_LABEL[nextMilestone]}
              </button>
            </div>
          )}

          {/* Survey report panel — shown when survey_completed or later */}
          {(taskStatus === 'survey_completed' || taskStatus === 'report_uploaded') && (
            <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-5 py-5">
              <p className="text-xs font-semibold text-forest-500 uppercase tracking-wide mb-3">Survey Report</p>

              {task?.report_uploaded || reportSuccess ? (
                <div className="bg-green-50 border border-green-200 rounded-xl px-4 py-3 text-sm text-green-700">
                  Report submitted
                </div>
              ) : (
                <>
                  {!showReport ? (
                    <button
                      onClick={() => setShowReport(true)}
                      className="w-full border-2 border-dashed border-forest-300 text-forest-600 text-sm font-medium py-3 rounded-xl hover:bg-forest-50 transition-colors"
                    >
                      + Submit Survey Report
                    </button>
                  ) : (
                    <form onSubmit={handleSubmitReport} className="space-y-3">
                      <div>
                        <label className="block text-xs text-forest-500 mb-1">Surveyor ID *</label>
                        <input
                          type="text"
                          required
                          value={reportSurveyor}
                          onChange={e => setReportSurveyor(e.target.value)}
                          placeholder="e.g. SURV-RM-01"
                          className="w-full border border-forest-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-forest-500 mb-1">Report Summary</label>
                        <textarea
                          rows={3}
                          value={reportSummary}
                          onChange={e => setReportSummary(e.target.value)}
                          placeholder="Brief summary of the survey…"
                          className="w-full border border-forest-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-forest-500 mb-1">Findings</label>
                        <textarea
                          rows={2}
                          value={reportFindings}
                          onChange={e => setReportFindings(e.target.value)}
                          placeholder="Key findings, measurements, boundary notes…"
                          className="w-full border border-forest-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>
                      <div>
                        <label className="block text-xs text-forest-500 mb-1">Field Notes</label>
                        <textarea
                          rows={2}
                          value={reportNotes}
                          onChange={e => setReportNotes(e.target.value)}
                          placeholder="Site conditions, access issues, recommendations…"
                          className="w-full border border-forest-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-forest-400"
                        />
                      </div>
                      <div className="flex gap-2">
                        <button
                          type="submit"
                          disabled={reportLoading}
                          className="flex-1 bg-forest-700 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-forest-800 disabled:opacity-50 transition-colors"
                        >
                          {reportLoading ? 'Submitting…' : 'Submit Report'}
                        </button>
                        <button
                          type="button"
                          onClick={() => setShowReport(false)}
                          className="text-sm text-forest-500 px-3 py-2 rounded-xl hover:bg-forest-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  )}
                </>
              )}
            </div>
          )}

          {/* Terminal / done notice */}
          {isComplete && (
            <div className="bg-forest-50 border border-forest-200 rounded-2xl px-5 py-4 text-sm text-forest-700">
              <p className="font-semibold mb-1">Survey Complete</p>
              <p className="text-forest-500">This task has been completed and is pending registrar review.</p>
            </div>
          )}

          {/* No task yet */}
          {!task && (
            <div className="bg-orange-50 border border-orange-200 rounded-2xl px-5 py-4 text-sm text-orange-700">
              <p className="font-semibold mb-1">No Survey Task Yet</p>
              <p className="text-orange-600">A staff member needs to assign a surveyor first using the auto-assign feature.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
