'use client'
import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import {
  getApplication, documentUrl,
  transitionApplication, holdApplication, rejectApplication, issueCertificate,
  addNote, updateDocumentStatus,
} from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import ApplicationTimeline from '@/components/ApplicationTimeline'

const STATE_LABEL = {
  pre_checked:        'Pre-Checked',
  survey_required:    'Send to Survey',
  surveyed:           'Mark Surveyed',
  legal_review:       'Send to Legal Review',
  approved:           'Approve',
  missing_documents:  'Request Missing Docs',
  under_objection:    'Mark Under Objection',
  closed:             'Close',
}

const STATE_BTN = {
  pre_checked:        'bg-blue-600   hover:bg-blue-700',
  survey_required:    'bg-amber-500  hover:bg-amber-600',
  surveyed:           'bg-teal-600   hover:bg-teal-700',
  legal_review:       'bg-purple-600 hover:bg-purple-700',
  approved:           'bg-forest-600 hover:bg-forest-700',
  missing_documents:  'bg-yellow-500 hover:bg-yellow-600',
  under_objection:    'bg-rose-600   hover:bg-rose-700',
  closed:             'bg-gray-500   hover:bg-gray-600',
}

const DOC_STATUS_CLS = {
  verified:       'bg-forest-100 text-forest-800 border-forest-300',
  pending_review: 'bg-earth-100  text-earth-800  border-earth-300',
  rejected:       'bg-red-100    text-red-700    border-red-200',
  missing:        'bg-yellow-50  text-yellow-700 border-yellow-200',
  pending:        'bg-gray-100   text-gray-600   border-gray-200',
}

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const inputCls = 'w-full border border-forest-200 rounded-lg px-3 py-2 text-sm text-forest-900 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400'

export default function StaffApplicationDetail() {
  const { id } = useParams()
  const [app,     setApp]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [actionLoading, setActionLoading] = useState(false)
  const [actionError,   setActionError]   = useState(null)
  const [actionSuccess, setActionSuccess] = useState(null)

  // Transition confirm flow
  const [pendingTransition, setPendingTransition] = useState(null)
  const [transitionNote,    setTransitionNote]    = useState('')

  // Hold form
  const [showHold,   setShowHold]   = useState(false)
  const [holdReason, setHoldReason] = useState('')

  // Reject form
  const [showReject,   setShowReject]   = useState(false)
  const [rejectReason, setRejectReason] = useState('')

  // Certificate form
  const [showCert,      setShowCert]      = useState(false)
  const [certIssuedBy,  setCertIssuedBy]  = useState('Registrar')
  const [certApplicant, setCertApplicant] = useState('')

  // Note form
  const [noteText,    setNoteText]    = useState('')
  const [noteLoading, setNoteLoading] = useState(false)

  // Per-document loading
  const [docLoading, setDocLoading] = useState({})

  const reload = useCallback(() => getApplication(id).then(setApp), [id])

  useEffect(() => {
    if (!id) return
    setLoading(true)
    getApplication(id)
      .then(setApp)
      .catch(() => setError('Application not found'))
      .finally(() => setLoading(false))
  }, [id])

  function flashSuccess(msg) {
    setActionSuccess(msg)
    setActionError(null)
    setTimeout(() => setActionSuccess(null), 5000)
  }

  async function doTransition() {
    if (!pendingTransition) return
    setActionLoading(true); setActionError(null)
    try {
      const updated = await transitionApplication(id, {
        target_state: pendingTransition,
        notes: transitionNote || undefined,
        actor_id: 'registrar',
        actor_type: 'staff',
      })
      setApp(updated)
      setPendingTransition(null)
      setTransitionNote('')
      flashSuccess(`Moved to "${(STATE_LABEL[pendingTransition] ?? pendingTransition).replace(/_/g, ' ')}".`)
    } catch (e) {
      setActionError(e?.detail ?? 'Transition failed.')
    } finally {
      setActionLoading(false)
    }
  }

  async function doHold() {
    if (!holdReason.trim()) return
    setActionLoading(true); setActionError(null)
    try {
      const updated = await holdApplication(id, { reason: holdReason, actor_id: 'registrar' })
      setApp(updated)
      setShowHold(false); setHoldReason('')
      flashSuccess('Application placed on hold.')
    } catch (e) {
      setActionError(e?.detail ?? 'Hold failed.')
    } finally {
      setActionLoading(false)
    }
  }

  async function doReject() {
    if (!rejectReason.trim()) return
    setActionLoading(true); setActionError(null)
    try {
      const updated = await rejectApplication(id, { reason: rejectReason, actor_id: 'registrar' })
      setApp(updated)
      setShowReject(false); setRejectReason('')
      flashSuccess('Application rejected.')
    } catch (e) {
      setActionError(e?.detail ?? 'Rejection failed.')
    } finally {
      setActionLoading(false)
    }
  }

  async function doIssueCert() {
    if (!certIssuedBy.trim()) return
    setActionLoading(true); setActionError(null)
    try {
      const cert = await issueCertificate(id, {
        issued_by: certIssuedBy,
        applicant_full_name: certApplicant || undefined,
      })
      await reload()
      setShowCert(false)
      flashSuccess(`Certificate ${cert.certificate_id} issued successfully.`)
    } catch (e) {
      setActionError(e?.detail ?? 'Certificate issuance failed.')
    } finally {
      setActionLoading(false)
    }
  }

  async function doAddNote(e) {
    e.preventDefault()
    if (!noteText.trim()) return
    setNoteLoading(true)
    try {
      const updated = await addNote(id, { note: noteText, actor_id: 'registrar' })
      setApp(updated)
      setNoteText('')
    } catch {
      alert('Failed to add note.')
    } finally {
      setNoteLoading(false)
    }
  }

  async function doUpdateDocStatus(documentType, status) {
    setDocLoading((p) => ({ ...p, [documentType]: true }))
    try {
      const updated = await updateDocumentStatus(id, documentType, { status, actor_id: 'registrar' })
      setApp(updated)
    } catch (e) {
      alert(e?.detail ?? 'Failed to update document status.')
    } finally {
      setDocLoading((p) => ({ ...p, [documentType]: false }))
    }
  }

  if (loading) return <div className="flex items-center justify-center min-h-64 text-forest-400">Loading…</div>
  if (error) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
      <Link href="/staff/applications" className="text-earth-600 underline text-sm">← Back to Applications</Link>
    </div>
  )
  if (!app) return null

  const parcel      = app.parcel_ref ?? {}
  const allowedNext = app.workflow?.allowed_next ?? []
  const isTerminal  = ['rejected', 'closed', 'certificate_issued'].includes(app.status)
  const notes       = app.internal?.notes ?? []

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">

      {/* Breadcrumb */}
      <nav className="text-sm text-forest-400 mb-6">
        <Link href="/staff" className="hover:text-forest-700">Staff Console</Link>
        <span className="mx-2">›</span>
        <Link href="/staff/applications" className="hover:text-forest-700">Applications</Link>
        <span className="mx-2">›</span>
        <span className="text-forest-700 font-medium">{app.application_id}</span>
      </nav>

      {/* Flash banners */}
      {actionSuccess && (
        <div className="mb-4 bg-forest-50 border border-forest-300 text-forest-800 rounded-xl px-5 py-3 text-sm">
          ✓ {actionSuccess}
        </div>
      )}
      {actionError && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-3 text-sm">
          {actionError}
        </div>
      )}

      {/* Main 3-column grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* ── Left: details, documents, notes, timeline ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Header card */}
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
            <div className="bg-earth-800 text-white px-6 py-5 flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-earth-300 text-xs font-mono mb-1">APPLICATION ID</p>
                <p className="text-xl font-bold font-mono">{app.application_id}</p>
                <p className="text-earth-200 text-sm mt-1 capitalize">{app.application_type?.replace(/_/g, ' ')}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <StatusBadge status={app.status} size="lg" />
                <span className="text-xs text-earth-300">Priority: {app.priority}</span>
              </div>
            </div>

            <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-5 text-sm">
              <div>
                <p className="text-xs text-forest-400 font-semibold uppercase tracking-wide mb-3">Applicant</p>
                <dl className="space-y-1.5">
                  <div className="flex gap-2"><dt className="text-forest-500 w-28">ID</dt><dd className="text-forest-800 font-medium">{app.applicant_ref?.applicant_id}</dd></div>
                  <div className="flex gap-2"><dt className="text-forest-500 w-28">Type</dt><dd className="text-forest-800 capitalize">{app.applicant_ref?.applicant_type}</dd></div>
                  <div className="flex gap-2"><dt className="text-forest-500 w-28">Representative</dt><dd className="text-forest-800">{app.applicant_ref?.submitted_by_representative ? 'Yes' : 'No'}</dd></div>
                </dl>
              </div>
              <div>
                <p className="text-xs text-forest-400 font-semibold uppercase tracking-wide mb-3">Parcel</p>
                <dl className="space-y-1.5">
                  <div className="flex gap-2"><dt className="text-forest-500 w-28">Number</dt><dd className="text-forest-800 font-medium">{parcel.parcel_number}</dd></div>
                  <div className="flex gap-2"><dt className="text-forest-500 w-28">Block</dt><dd className="text-forest-800">{parcel.block_number}</dd></div>
                  <div className="flex gap-2"><dt className="text-forest-500 w-28">Basin</dt><dd className="text-forest-800">{parcel.basin_number}</dd></div>
                  <div className="flex gap-2"><dt className="text-forest-500 w-28">Zone</dt><dd className="text-forest-800">{parcel.zone_id}</dd></div>
                </dl>
              </div>
            </div>

            {app.description && (
              <div className="border-t border-forest-100 px-6 py-3 text-sm text-forest-600">{app.description}</div>
            )}

            <div className="border-t border-forest-100 px-6 py-4 text-xs text-forest-400 flex flex-wrap gap-5">
              <span>Submitted: {fmt(app.timestamps?.submitted_at)}</span>
              <span>Updated: {fmt(app.timestamps?.updated_at)}</span>
              {app.timestamps?.approved_at && <span>Approved: {fmt(app.timestamps.approved_at)}</span>}
              {app.timestamps?.certificate_issued_at && <span>Certificate: {fmt(app.timestamps.certificate_issued_at)}</span>}
            </div>

            {app.rejection_reason && (
              <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
                <strong>Rejected:</strong> {app.rejection_reason}
              </div>
            )}
            {app.hold_reason && (
              <div className="border-t border-orange-200 bg-orange-50 px-6 py-3 text-sm text-orange-700">
                <strong>On Hold:</strong> {app.hold_reason}
              </div>
            )}
            {app.objection?.has_objection && (
              <div className="border-t border-rose-200 bg-rose-50 px-6 py-3 text-sm text-rose-700">
                ⚠ Active objection filed by applicant.
              </div>
            )}
          </div>

          {/* Documents with registrar actions */}
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
            <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-4">Documents</p>
            {!app.required_documents?.length && (
              <p className="text-sm text-forest-400">No documents submitted.</p>
            )}
            {app.required_documents?.map((d) => {
              const dl = docLoading[d.document_type]
              return (
                <div key={d.document_type} className="py-3 flex flex-wrap items-center gap-2 border-b border-forest-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forest-800 capitalize">{d.document_type.replace(/_/g, ' ')}</p>
                    {d.filename && <p className="text-xs text-forest-400 truncate">{d.filename}</p>}
                    {d.uploaded_at && <p className="text-xs text-forest-300">Uploaded {fmt(d.uploaded_at)}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${DOC_STATUS_CLS[d.status] ?? 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {d.status?.replace(/_/g, ' ')}
                  </span>
                  {d.file_id && (
                    <a href={documentUrl(id, d.file_id)} target="_blank" rel="noopener noreferrer"
                      className="text-xs text-earth-600 underline hover:text-earth-800 shrink-0">
                      View
                    </a>
                  )}
                  {/* Registrar review actions */}
                  {d.file_id && d.status !== 'verified' && (
                    <button
                      disabled={dl}
                      onClick={() => doUpdateDocStatus(d.document_type, 'verified')}
                      className="text-xs px-2.5 py-1 rounded-lg border border-forest-300 text-forest-700 hover:bg-forest-50 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {dl ? '…' : '✓ Verify'}
                    </button>
                  )}
                  {d.file_id && d.status !== 'rejected' && (
                    <button
                      disabled={dl}
                      onClick={() => doUpdateDocStatus(d.document_type, 'rejected')}
                      className="text-xs px-2.5 py-1 rounded-lg border border-red-200 text-red-600 hover:bg-red-50 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {dl ? '…' : '✕ Reject Doc'}
                    </button>
                  )}
                  {!d.file_id && (
                    <button
                      disabled={dl}
                      onClick={() => doUpdateDocStatus(d.document_type, 'missing')}
                      className="text-xs px-2.5 py-1 rounded-lg border border-yellow-200 text-yellow-700 hover:bg-yellow-50 disabled:opacity-40 transition-colors shrink-0"
                    >
                      {dl ? '…' : 'Mark Missing'}
                    </button>
                  )}
                </div>
              )
            })}
          </div>

          {/* Internal Notes */}
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
            <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-4">Internal Notes</p>
            {notes.length === 0 && (
              <p className="text-sm text-forest-400 mb-4">No internal notes yet.</p>
            )}
            {notes.length > 0 && (
              <div className="space-y-2 mb-4 max-h-48 overflow-y-auto">
                {[...notes].reverse().map((n, i) => (
                  <div key={i} className="text-xs font-mono text-forest-700 bg-forest-50 rounded-lg px-3 py-2 leading-relaxed">
                    {n}
                  </div>
                ))}
              </div>
            )}
            <form onSubmit={doAddNote} className="flex gap-2">
              <input
                value={noteText}
                onChange={(e) => setNoteText(e.target.value)}
                placeholder="Add internal note…"
                className={inputCls}
              />
              <button
                type="submit"
                disabled={noteLoading || !noteText.trim()}
                className="bg-forest-600 hover:bg-forest-700 text-white text-sm px-4 py-2 rounded-lg font-medium disabled:opacity-40 transition-colors whitespace-nowrap"
              >
                {noteLoading ? '…' : 'Add'}
              </button>
            </form>
          </div>

          {/* Timeline */}
          <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
            <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-5">Status Timeline</p>
            <ApplicationTimeline application={app} />
          </div>
        </div>

        {/* ── Right: action panel (sticky) ── */}
        <div className="space-y-4 lg:sticky lg:top-6 self-start">

          {/* Certificate issuance — shown only when approved */}
          {app.status === 'approved' && (
            <div className="bg-forest-50 border border-forest-300 rounded-2xl px-5 py-4">
              <p className="text-sm font-bold text-forest-800 mb-1">Ready to Issue Certificate</p>
              <p className="text-xs text-forest-600 mb-3">
                All checks passed. Generate the official land registration certificate.
              </p>
              {!showCert ? (
                <button
                  onClick={() => setShowCert(true)}
                  className="w-full bg-forest-700 hover:bg-forest-800 text-white text-sm px-4 py-2.5 rounded-lg font-medium transition-colors"
                >
                  Issue Certificate →
                </button>
              ) : (
                <div className="space-y-2">
                  <input
                    value={certIssuedBy}
                    onChange={(e) => setCertIssuedBy(e.target.value)}
                    placeholder="Issued by (name or ID)"
                    className={inputCls}
                  />
                  <input
                    value={certApplicant}
                    onChange={(e) => setCertApplicant(e.target.value)}
                    placeholder="Applicant full name (optional)"
                    className={inputCls}
                  />
                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={doIssueCert}
                      disabled={actionLoading || !certIssuedBy.trim()}
                      className="flex-1 bg-forest-700 hover:bg-forest-800 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                    >
                      {actionLoading ? 'Issuing…' : 'Confirm Issue'}
                    </button>
                    <button
                      onClick={() => setShowCert(false)}
                      className="text-sm px-3 py-2 border border-forest-200 rounded-lg text-forest-600 hover:bg-forest-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Workflow transitions */}
          {!isTerminal && allowedNext.length > 0 && (
            <div className="bg-white border border-forest-100 rounded-2xl px-5 py-4 shadow-sm">
              <p className="text-xs font-semibold text-forest-600 uppercase tracking-wide mb-3">Move Application</p>

              {pendingTransition ? (
                <div className="space-y-2">
                  <p className="text-sm text-forest-700">
                    Confirm move to{' '}
                    <strong className="text-forest-900">
                      {(STATE_LABEL[pendingTransition] ?? pendingTransition).replace(/_/g, ' ')}
                    </strong>
                    ?
                  </p>
                  <textarea
                    value={transitionNote}
                    onChange={(e) => setTransitionNote(e.target.value)}
                    rows={2}
                    placeholder="Add note (optional)…"
                    className={`${inputCls} resize-none`}
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={doTransition}
                      disabled={actionLoading}
                      className={`flex-1 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition-colors ${STATE_BTN[pendingTransition] ?? 'bg-forest-600 hover:bg-forest-700'}`}
                    >
                      {actionLoading ? 'Processing…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => { setPendingTransition(null); setTransitionNote('') }}
                      className="text-sm px-3 py-2 border border-forest-200 rounded-lg text-forest-600 hover:bg-forest-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {allowedNext.map((s) => (
                    <button
                      key={s}
                      onClick={() => setPendingTransition(s)}
                      className={`w-full text-white text-sm px-4 py-2 rounded-lg font-medium transition-colors ${STATE_BTN[s] ?? 'bg-gray-500 hover:bg-gray-600'}`}
                    >
                      → {(STATE_LABEL[s] ?? s).replace(/_/g, ' ')}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Place on Hold */}
          {!isTerminal && app.status !== 'on_hold' && (
            <div className="bg-white border border-orange-100 rounded-2xl px-5 py-4 shadow-sm">
              <button
                onClick={() => setShowHold(!showHold)}
                className="w-full flex items-center justify-between text-sm font-semibold text-orange-700"
              >
                <span>Place on Hold</span>
                <span className="text-xs">{showHold ? '▲' : '▼'}</span>
              </button>
              {showHold && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={holdReason}
                    onChange={(e) => setHoldReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for hold (required)"
                    className="w-full border border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
                  />
                  <button
                    onClick={doHold}
                    disabled={actionLoading || !holdReason.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? 'Processing…' : 'Confirm Hold'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Reject */}
          {!isTerminal && app.status !== 'rejected' && (
            <div className="bg-white border border-red-100 rounded-2xl px-5 py-4 shadow-sm">
              <button
                onClick={() => setShowReject(!showReject)}
                className="w-full flex items-center justify-between text-sm font-semibold text-red-700"
              >
                <span>Reject Application</span>
                <span className="text-xs">{showReject ? '▲' : '▼'}</span>
              </button>
              {showReject && (
                <div className="mt-3 space-y-2">
                  <textarea
                    value={rejectReason}
                    onChange={(e) => setRejectReason(e.target.value)}
                    rows={2}
                    placeholder="Reason for rejection (required)"
                    className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-400 resize-none"
                  />
                  <button
                    onClick={doReject}
                    disabled={actionLoading || !rejectReason.trim()}
                    className="w-full bg-red-600 hover:bg-red-700 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
                  >
                    {actionLoading ? 'Processing…' : 'Confirm Reject'}
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Terminal notice */}
          {isTerminal && (
            <div className="bg-gray-50 border border-gray-200 rounded-2xl px-5 py-4 text-sm text-gray-600">
              This application is <strong>{app.status?.replace(/_/g, ' ')}</strong> and can no longer be modified.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
