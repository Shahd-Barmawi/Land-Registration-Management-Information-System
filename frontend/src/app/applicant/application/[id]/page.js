'use client'
import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import dynamic from 'next/dynamic'
import Link from 'next/link'
import { getApplication, submitObjection, uploadDocument, documentUrl } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'
import ApplicationTimeline from '@/components/ApplicationTimeline'

const ALL_DOC_TYPES = [
  { value: 'ownership_deed',       label: 'Ownership Deed' },
  { value: 'id_copy',              label: 'ID Copy' },
  { value: 'sale_contract',        label: 'Sale Contract' },
  { value: 'inheritance_document', label: 'Inheritance Document' },
  { value: 'court_order',          label: 'Court Order' },
  { value: 'survey_report',        label: 'Survey Report' },
  { value: 'power_of_attorney',    label: 'Power of Attorney' },
]

const MapView = dynamic(() => import('@/components/MapView'), { ssr: false })

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const inputCls = 'w-full border border-forest-200 rounded-lg px-3 py-2 text-forest-900 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400 text-sm'

export default function ApplicationDetailPage() {
  const { id }   = useParams()
  const [app,     setApp]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [error,   setError]   = useState(null)

  const [showObjection, setShowObjection] = useState(false)
  const [objReason,     setObjReason]     = useState('')
  const [objLoading,    setObjLoading]    = useState(false)
  const [objSuccess,    setObjSuccess]    = useState(false)

  const [uploadState,    setUploadState]    = useState({})
  const [newDocType,     setNewDocType]     = useState('')
  const [newDocFile,     setNewDocFile]     = useState(null)
  const [newDocLoading,  setNewDocLoading]  = useState(false)

  useEffect(() => {
    if (!id) return
    getApplication(id)
      .then(setApp)
      .catch(() => setError('Application not found'))
      .finally(() => setLoading(false))
  }, [id])

  async function handleObjection(e) {
    e.preventDefault()
    if (!objReason.trim()) return
    setObjLoading(true)
    try {
      await submitObjection(id, { reason: objReason, actor_id: 'applicant' })
      setObjSuccess(true)
      setObjReason('')
      setShowObjection(false)
      const updated = await getApplication(id)
      setApp(updated)
    } catch {
      alert('Failed to submit objection. Please try again.')
    } finally {
      setObjLoading(false)
    }
  }

  async function handleUpload(documentType, file) {
    setUploadState((s) => ({ ...s, [documentType]: { loading: true, error: null } }))
    try {
      const updated = await uploadDocument(id, documentType, file)
      setApp(updated)
      setUploadState((s) => ({ ...s, [documentType]: { loading: false, error: null } }))
    } catch (err) {
      setUploadState((s) => ({ ...s, [documentType]: { loading: false, error: err?.detail ?? 'Upload failed' } }))
    }
  }

  async function handleNewDoc(e) {
    e.preventDefault()
    if (!newDocType.trim() || !newDocFile) return
    setNewDocLoading(true)
    try {
      const updated = await uploadDocument(id, newDocType.trim(), newDocFile)
      setApp(updated)
      setNewDocType('')
      setNewDocFile(null)
    } catch (err) {
      alert(err?.detail ?? 'Upload failed')
    } finally {
      setNewDocLoading(false)
    }
  }

  if (loading) return (
    <div className="flex items-center justify-center min-h-64 text-forest-400">Loading application…</div>
  )
  if (error) return (
    <div className="max-w-2xl mx-auto px-6 py-20 text-center">
      <p className="text-red-600 text-lg font-semibold mb-4">{error}</p>
      <Link href="/applicant/track" className="text-forest-600 underline text-sm">← Back to Track</Link>
    </div>
  )
  if (!app) return null

  const parcel = app.parcel_ref ?? {}

  return (
    <div className="max-w-4xl mx-auto px-6 py-10 space-y-6">

      <nav className="text-sm text-forest-400">
        <Link href="/applicant" className="hover:text-forest-700">Home</Link>
        <span className="mx-2">›</span>
        <Link href="/applicant/track" className="hover:text-forest-700">Track</Link>
        <span className="mx-2">›</span>
        <span className="text-forest-700 font-medium">{app.application_id}</span>
      </nav>

      {/* Header */}
      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="bg-forest-800 text-white px-6 py-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-forest-300 text-xs font-mono mb-1">APPLICATION ID</p>
            <p className="text-xl font-bold font-mono">{app.application_id}</p>
            <p className="text-forest-200 text-sm mt-1 capitalize">{app.application_type?.replace(/_/g, ' ')}</p>
          </div>
          <div className="flex flex-col items-end gap-2">
            <StatusBadge status={app.status} size="lg" />
            <span className="text-xs text-forest-300">Priority: {app.priority}</span>
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
          <div className="border-t border-forest-100 px-6 py-4 text-sm text-forest-600">{app.description}</div>
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
          <div className="border-t border-red-200 bg-red-50 px-6 py-3 text-sm text-red-700">
            ⚠️ This application has an active objection.
          </div>
        )}
      </div>

      {/* Documents */}
      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
        <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-4">Documents</p>

        {app.required_documents?.length === 0 && (
          <p className="text-sm text-forest-400 mb-4">No documents declared yet.</p>
        )}

        {app.required_documents?.length > 0 && (
          <div className="divide-y divide-forest-50">
            {app.required_documents.map((d) => {
              const us = uploadState[d.document_type] ?? {}
              const statusColor =
                d.status === 'verified'       ? 'bg-forest-100 text-forest-800 border-forest-300' :
                d.status === 'pending_review' ? 'bg-earth-100  text-earth-800  border-earth-300'  :
                d.status === 'missing'        ? 'bg-red-50     text-red-700    border-red-200'    :
                                                'bg-gray-100   text-gray-600   border-gray-200'
              return (
                <div key={d.document_type} className="py-3 flex flex-wrap items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-forest-800 capitalize">{d.document_type.replace(/_/g, ' ')}</p>
                    {d.filename && <p className="text-xs text-forest-400 truncate">{d.filename}</p>}
                  </div>
                  <span className={`text-xs px-2.5 py-1 rounded-full border font-medium shrink-0 ${statusColor}`}>
                    {d.status}
                  </span>
                  {d.file_id && (
                    <a
                      href={documentUrl(id, d.file_id)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-forest-600 underline hover:text-forest-800 shrink-0"
                    >
                      View
                    </a>
                  )}
                  <label className={`shrink-0 cursor-pointer text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                    us.loading
                      ? 'border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-forest-300 text-forest-700 hover:bg-forest-50'
                  }`}>
                    {us.loading ? 'Uploading…' : d.file_id ? 'Replace' : 'Upload'}
                    <input
                      type="file"
                      className="hidden"
                      disabled={us.loading}
                      onChange={(e) => {
                        const f = e.target.files?.[0]
                        if (f) handleUpload(d.document_type, f)
                        e.target.value = ''
                      }}
                    />
                  </label>
                  {us.error && <p className="w-full text-xs text-red-600">{us.error}</p>}
                </div>
              )
            })}
          </div>
        )}

        {(() => {
          const submittedTypes = new Set((app.required_documents ?? []).map((d) => d.document_type))
          const remaining = ALL_DOC_TYPES.filter((t) => !submittedTypes.has(t.value))
          if (remaining.length === 0) return null
          return (
            <form onSubmit={handleNewDoc} className="mt-4 pt-4 border-t border-forest-100 flex flex-wrap gap-2 items-end">
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-forest-500 mb-1">Additional document</label>
                <select
                  value={newDocType}
                  onChange={(e) => setNewDocType(e.target.value)}
                  className={inputCls}
                >
                  <option value="">Select type…</option>
                  {remaining.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-40">
                <label className="block text-xs text-forest-500 mb-1">File</label>
                <input
                  type="file"
                  onChange={(e) => setNewDocFile(e.target.files?.[0] ?? null)}
                  className="w-full text-xs text-forest-700 file:mr-2 file:py-1.5 file:px-3 file:rounded-lg file:border file:border-forest-200 file:text-xs file:font-medium file:bg-white file:text-forest-700 hover:file:bg-forest-50"
                />
              </div>
              <button
                type="submit"
                disabled={newDocLoading || !newDocType || !newDocFile}
                className="bg-forest-600 hover:bg-forest-700 text-white text-xs px-4 py-2 rounded-lg font-medium disabled:opacity-40 transition-colors"
              >
                {newDocLoading ? 'Uploading…' : 'Upload'}
              </button>
            </form>
          )
        })()}
      </div>

      {/* Timeline */}
      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
        <p className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-5">Status Timeline</p>
        <ApplicationTimeline application={app} />
      </div>

      {/* Submit Objection */}
      {!['closed', 'rejected', 'certificate_issued'].includes(app.status) && (
        <div className="bg-white border border-forest-100 rounded-2xl shadow-sm px-6 py-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-forest-800 text-sm">Submit an Objection</p>
              <p className="text-xs text-forest-400 mt-0.5">If you believe there is an error or dispute with this application.</p>
            </div>
            <button
              onClick={() => setShowObjection(!showObjection)}
              className="text-sm border border-red-200 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors"
            >
              {showObjection ? 'Cancel' : 'File Objection'}
            </button>
          </div>

          {showObjection && (
            <form onSubmit={handleObjection} className="mt-4 space-y-3">
              <textarea
                value={objReason}
                onChange={(e) => setObjReason(e.target.value)}
                rows={3}
                placeholder="Describe the reason for your objection…"
                className={`${inputCls} resize-none`}
                required
              />
              <button
                type="submit"
                disabled={objLoading}
                className="bg-red-600 hover:bg-red-700 text-white text-sm px-5 py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
              >
                {objLoading ? 'Submitting…' : 'Submit Objection'}
              </button>
            </form>
          )}

          {objSuccess && <p className="text-sm text-forest-600 mt-3">✓ Objection submitted successfully.</p>}
        </div>
      )}
    </div>
  )
}
