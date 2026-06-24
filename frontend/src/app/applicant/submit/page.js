'use client'
import { useState, useId, useEffect } from 'react'
import dynamic from 'next/dynamic'
import { useRouter } from 'next/navigation'
import StepIndicator from '@/components/StepIndicator'
import { createApplication, createParcel, getParcel, uploadDocument } from '@/lib/api'
import { getUser, isLoggedIn } from '@/lib/auth'

const MapPicker = dynamic(() => import('@/components/MapPicker'), { ssr: false })

const STEPS = ['Type', 'Applicant', 'Parcel & Map', 'Documents', 'Review']

const APP_TYPES = [
  { value: 'first_registration',  label: 'First Registration',   icon: '🏠', desc: 'Register a parcel for the first time' },
  { value: 'ownership_transfer',  label: 'Ownership Transfer',   icon: '🤝', desc: 'Transfer ownership to a new owner' },
  { value: 'parcel_subdivision',  label: 'Parcel Subdivision',   icon: '✂️', desc: 'Divide a parcel into smaller ones' },
  { value: 'parcel_merge',        label: 'Parcel Merge',         icon: '🔗', desc: 'Combine two or more adjacent parcels' },
  { value: 'boundary_correction', label: 'Boundary Correction',  icon: '📐', desc: 'Correct a boundary discrepancy' },
  { value: 'certificate_request', label: 'Certificate Request',  icon: '🏅', desc: 'Request an ownership certificate' },
]

const DOC_TYPES = [
  { value: 'ownership_deed',        label: 'Ownership Deed' },
  { value: 'id_copy',               label: 'ID Copy' },
  { value: 'sale_contract',         label: 'Sale Contract' },
  { value: 'inheritance_document',  label: 'Inheritance Document' },
  { value: 'court_order',           label: 'Court Order' },
  { value: 'survey_report',         label: 'Survey Report' },
  { value: 'power_of_attorney',     label: 'Power of Attorney' },
]

const ZONES = ['ZONE-RM-01', 'ZONE-RM-02', 'ZONE-JRS-01', 'ZONE-HBR-01', 'ZONE-NLK-01']

const EMPTY = {
  application_type: '',
  priority: 'normal',
  applicant_id: '',
  applicant_type: 'citizen',
  submitted_by_representative: false,
  parcel_number: '',
  block_number: '',
  basin_number: '',
  zone_id: '',
  description: '',
  geometry: null,
  documents: [],
}

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-forest-800 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

const inputCls = 'w-full border border-forest-200 rounded-lg px-3 py-2 text-forest-900 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400 focus:border-transparent'
const selectCls = inputCls

export default function SubmitPage() {
  const router = useRouter()
  const uid    = useId()
  const [step,    setStep]    = useState(1)
  const [form,    setForm]    = useState(EMPTY)
  const [loading, setLoading] = useState(false)
  const [status,  setStatus]  = useState('')
  const [error,   setError]   = useState(null)
  const [authUser, setAuthUser] = useState(null)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/applicant/login')
      return
    }
    const u = getUser()
    setAuthUser(u)
    // Pre-fill applicant_id from session
    if (u?.applicant_id) {
      setForm(f => ({ ...f, applicant_id: u.applicant_id }))
    }
  }, [router])

  const set = (field, val) => setForm((f) => ({ ...f, [field]: val }))

  const getDoc = (type) => form.documents.find((d) => d.document_type === type)

  const setDocFile = (type, file) => {
    setForm((f) => {
      const exists = f.documents.find((d) => d.document_type === type)
      return {
        ...f,
        documents: exists
          ? f.documents.map((d) => d.document_type === type ? { ...d, file } : d)
          : [...f.documents, { document_type: type, file }],
      }
    })
  }

  const removeDoc = (type) =>
    setForm((f) => ({ ...f, documents: f.documents.filter((d) => d.document_type !== type) }))

  const canNext = () => {
    if (step === 1) return !!form.application_type
    if (step === 2) return !!(form.applicant_id && form.applicant_type)
    if (step === 3) return !!(form.parcel_number && form.block_number && form.basin_number && form.zone_id)
    return true
  }

  async function handleSubmit() {
    setLoading(true)
    setError(null)
    try {
      setStatus('Creating parcel record…')
      const parcelBody = {
        parcel_number: form.parcel_number,
        block_number:  form.block_number,
        basin_number:  form.basin_number,
        zone_id:       form.zone_id,
      }
      if (form.geometry) parcelBody.geometry = form.geometry

      let parcel
      try {
        parcel = await createParcel(parcelBody)
      } catch (err) {
        // 409 means parcel already exists — fetch it by its generated code
        if (typeof err?.detail === 'string' && err.detail.includes('already exists')) {
          const parts    = form.zone_id.split('-')
          const city     = parts[1] ?? form.zone_id
          const zoneNum  = parts[2] ?? '00'
          const code     = `${city}-Z${zoneNum}-B${form.block_number}-P${form.parcel_number}`
          parcel = await getParcel(code)
        } else {
          throw err
        }
      }
      const parcel_id = parcel.id

      setStatus('Submitting application…')
      const body = {
        application_type: form.application_type,
        priority:         form.priority,
        applicant_ref: {
          applicant_id:                form.applicant_id,
          applicant_type:              form.applicant_type,
          submitted_by_representative: form.submitted_by_representative,
        },
        parcel_ref: {
          parcel_id,
          parcel_number: form.parcel_number,
          block_number:  form.block_number,
          basin_number:  form.basin_number,
          zone_id:       form.zone_id,
        },
        description: form.description || null,
        required_documents: form.documents.map((d) => ({
          document_type: d.document_type,
          required: true,
          status: d.file ? 'pending_review' : 'pending',
        })),
      }

      const app = await createApplication(body, `${uid}-${Date.now()}`)

      const withFiles = form.documents.filter((d) => d.file)
      for (let i = 0; i < withFiles.length; i++) {
        const d = withFiles[i]
        setStatus(`Uploading ${d.document_type.replace(/_/g, ' ')} (${i + 1}/${withFiles.length})…`)
        await uploadDocument(app.application_id, d.document_type, d.file)
      }

      router.push(`/applicant/application/${app.application_id}`)
    } catch (err) {
      let msg = 'Submission failed.'
      if (err?.detail) {
        msg = Array.isArray(err.detail)
          ? err.detail.map((e) => e.msg ?? JSON.stringify(e)).join(' · ')
          : String(err.detail)
      } else if (err?.message) {
        msg = err.message === 'Failed to fetch'
          ? 'Cannot reach the server. Make sure the backend is running on port 8000.'
          : err.message
      }
      setError(msg)
    } finally {
      setLoading(false)
      setStatus('')
    }
  }

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">
      <h1 className="text-2xl font-bold text-forest-800 mb-2">New Land Registration Application</h1>
      <p className="text-forest-500 text-sm mb-8">Complete all steps to submit your application.</p>

      <StepIndicator steps={STEPS} current={step} />

      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm p-8">

        {step === 1 && (
          <div>
            <h2 className="text-lg font-bold text-forest-800 mb-5">Select Application Type</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {APP_TYPES.map((t) => (
                <button
                  key={t.value}
                  onClick={() => set('application_type', t.value)}
                  className={`text-left p-4 rounded-xl border-2 transition-all ${
                    form.application_type === t.value
                      ? 'border-forest-500 bg-forest-50'
                      : 'border-forest-100 hover:border-forest-300 bg-white'
                  }`}
                >
                  <span className="text-2xl">{t.icon}</span>
                  <p className="font-semibold text-forest-800 mt-1">{t.label}</p>
                  <p className="text-xs text-forest-500 mt-0.5">{t.desc}</p>
                </button>
              ))}
            </div>
            <div className="mt-6 grid grid-cols-2 gap-4">
              <Field label="Priority">
                <select className={selectCls} value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  {['low','normal','high','urgent'].map((p) => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              </Field>
              <Field label="Description">
                <input className={inputCls} placeholder="Optional" value={form.description} onChange={(e) => set('description', e.target.value)} />
              </Field>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-forest-800">Applicant Information</h2>

            {/* Signed-in user — read-only */}
            <div className="bg-forest-50 border border-forest-200 rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-forest-700 text-white flex items-center justify-center font-bold text-sm shrink-0">
                  {authUser?.full_name?.[0] ?? '?'}
                </div>
                <div>
                  <p className="font-semibold text-forest-900">{authUser?.full_name}</p>
                  <p className="text-xs text-forest-500">{authUser?.email}</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 text-sm pt-1">
                <div>
                  <p className="text-forest-400 text-xs">Applicant ID</p>
                  <p className="font-mono font-medium text-forest-800 truncate">{authUser?.applicant_id}</p>
                </div>
              </div>
            </div>

            <Field label="Applicant Type">
              <select className={selectCls} value={form.applicant_type} onChange={(e) => set('applicant_type', e.target.value)}>
                {['citizen','lawyer','company','authorized_representative'].map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </Field>
            <label className="flex items-center gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={form.submitted_by_representative}
                onChange={(e) => set('submitted_by_representative', e.target.checked)}
                className="w-4 h-4 accent-forest-500"
              />
              <span className="text-sm text-forest-700">Submitted by an authorized representative</span>
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-5">
            <h2 className="text-lg font-bold text-forest-800">Parcel Details</h2>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Parcel Number" required>
                <input className={inputCls} placeholder="e.g. 145" value={form.parcel_number} onChange={(e) => set('parcel_number', e.target.value)} />
              </Field>
              <Field label="Block Number" required>
                <input className={inputCls} placeholder="e.g. 12" value={form.block_number} onChange={(e) => set('block_number', e.target.value)} />
              </Field>
              <Field label="Basin Number" required>
                <input className={inputCls} placeholder="e.g. 3" value={form.basin_number} onChange={(e) => set('basin_number', e.target.value)} />
              </Field>
              <Field label="Zone" required>
                <select className={selectCls} value={form.zone_id} onChange={(e) => set('zone_id', e.target.value)}>
                  <option value="">Select zone…</option>
                  {ZONES.map((z) => <option key={z} value={z}>{z}</option>)}
                </select>
              </Field>
            </div>
            <div>
              <p className="text-sm font-semibold text-forest-800 mb-2">
                Parcel Location <span className="text-forest-400 font-normal">(click map to mark)</span>
              </p>
              <MapPicker onGeometry={(geo) => set('geometry', geo)} />
              {form.geometry && <p className="text-xs text-forest-500 mt-1">✓ Location marked</p>}
            </div>
          </div>
        )}

        {step === 4 && (
          <div>
            <h2 className="text-lg font-bold text-forest-800 mb-1">Upload Documents</h2>
            <p className="text-sm text-forest-500 mb-5">
              Attach a file for each document you have ready. You can skip any you don't have yet.
            </p>
            <div className="space-y-2">
              {DOC_TYPES.map(({ value, label }) => {
                const doc = getDoc(value)
                return (
                  <div
                    key={value}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      doc ? 'border-forest-400 bg-forest-50' : 'border-forest-100'
                    }`}
                  >
                    <span className="text-lg shrink-0">{doc?.file ? '📄' : '📋'}</span>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-forest-800">{label}</p>
                      {doc?.file && (
                        <p className="text-xs text-forest-500 truncate">{doc.file.name}</p>
                      )}
                    </div>
                    {doc && (
                      <button
                        onClick={() => removeDoc(value)}
                        className="text-xs text-red-400 hover:text-red-600 shrink-0"
                      >
                        ✕
                      </button>
                    )}
                    <label className="shrink-0 cursor-pointer text-xs px-3 py-1.5 rounded-lg border border-forest-300 text-forest-700 hover:bg-forest-100 transition-colors">
                      {doc?.file ? 'Change' : 'Choose file'}
                      <input
                        type="file"
                        className="hidden"
                        onChange={(e) => {
                          const f = e.target.files?.[0]
                          if (f) setDocFile(value, f)
                          e.target.value = ''
                        }}
                      />
                    </label>
                  </div>
                )
              })}
            </div>
            {form.documents.length > 0 && (
              <p className="text-xs text-forest-500 mt-4">
                {form.documents.filter(d => d.file).length} file(s) ready to upload
              </p>
            )}
          </div>
        )}

        {step === 5 && (
          <div>
            <h2 className="text-lg font-bold text-forest-800 mb-5">Review & Submit</h2>
            <dl className="divide-y divide-forest-100 text-sm">
              {[
                ['Application Type', form.application_type?.replace(/_/g,' ')],
                ['Priority',         form.priority],
                ['Applicant ID',     form.applicant_id],
                ['Applicant Type',   form.applicant_type?.replace(/_/g,' ')],
                ['Parcel',           `${form.parcel_number} / Block ${form.block_number} / Basin ${form.basin_number}`],
                ['Zone',             form.zone_id],
                ['Location',         form.geometry ? '✓ Marked on map' : '—'],
              ].map(([k, v]) => (
                <div key={k} className="flex py-2.5">
                  <dt className="w-40 text-forest-500 shrink-0">{k}</dt>
                  <dd className="text-forest-900 font-medium capitalize">{v}</dd>
                </div>
              ))}
            </dl>

            {form.documents.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-semibold text-forest-600 uppercase tracking-wide mb-2">Documents</p>
                <div className="space-y-1">
                  {form.documents.map((d) => (
                    <div key={d.document_type} className="flex items-center gap-2 text-sm">
                      <span className="text-forest-400">📄</span>
                      <span className="text-forest-800 font-medium capitalize">{d.document_type.replace(/_/g,' ')}</span>
                      {d.file
                        ? <span className="text-forest-500 truncate text-xs">— {d.file.name}</span>
                        : <span className="text-orange-400 text-xs">— no file attached</span>
                      }
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {error}
              </div>
            )}
            {status && (
              <div className="mt-4 bg-forest-50 border border-forest-200 text-forest-700 text-sm rounded-lg px-4 py-3">
                {status}
              </div>
            )}
          </div>
        )}

        <div className="flex justify-between mt-8 pt-6 border-t border-forest-100">
          <button
            onClick={() => setStep((s) => s - 1)}
            disabled={step === 1 || loading}
            className="px-5 py-2 rounded-lg border border-forest-200 text-forest-700 text-sm font-medium hover:bg-forest-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            ← Back
          </button>

          {step < STEPS.length ? (
            <button
              onClick={() => setStep((s) => s + 1)}
              disabled={!canNext()}
              className="px-6 py-2 rounded-lg bg-forest-600 hover:bg-forest-700 text-white text-sm font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Continue →
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-7 py-2 rounded-lg bg-earth-500 hover:bg-earth-600 text-white font-semibold text-sm disabled:opacity-50 transition-colors"
            >
              {loading ? status || 'Submitting…' : 'Submit Application'}
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
