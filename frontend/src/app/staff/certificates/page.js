'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { listApplications, issueCertificate } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  })
}

const inputCls = 'w-full border border-forest-200 rounded-lg px-3 py-2 text-sm text-forest-900 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400'

function IssueForm({ app, onSuccess }) {
  const [issuedBy,       setIssuedBy]       = useState('Registrar')
  const [applicantName,  setApplicantName]  = useState('')
  const [loading,        setLoading]        = useState(false)
  const [error,          setError]          = useState(null)
  const [cert,           setCert]           = useState(null)

  async function submit(e) {
    e.preventDefault()
    if (!issuedBy.trim()) return
    setLoading(true); setError(null)
    try {
      const c = await issueCertificate(app.application_id, {
        issued_by: issuedBy,
        applicant_full_name: applicantName || undefined,
      })
      setCert(c)
      onSuccess(app.application_id)
    } catch (ex) {
      setError(ex?.detail ?? 'Certificate issuance failed.')
    } finally {
      setLoading(false)
    }
  }

  if (cert) {
    return (
      <div className="mt-3 bg-forest-50 border border-forest-200 rounded-xl px-4 py-3 text-sm text-forest-800">
        ✓ Certificate <span className="font-bold font-mono">{cert.certificate_id}</span> issued on {fmt(cert.issued_at)}.
      </div>
    )
  }

  return (
    <form onSubmit={submit} className="mt-3 space-y-2">
      <input
        value={issuedBy}
        onChange={(e) => setIssuedBy(e.target.value)}
        placeholder="Issued by (name or staff ID)"
        className={inputCls}
        required
      />
      <input
        value={applicantName}
        onChange={(e) => setApplicantName(e.target.value)}
        placeholder="Applicant full name (optional)"
        className={inputCls}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
      <button
        type="submit"
        disabled={loading || !issuedBy.trim()}
        className="w-full bg-forest-700 hover:bg-forest-800 text-white text-sm py-2 rounded-lg font-medium disabled:opacity-50 transition-colors"
      >
        {loading ? 'Issuing…' : 'Issue Certificate'}
      </button>
    </form>
  )
}

export default function CertificatesPage() {
  const [approved,   setApproved]   = useState(null)
  const [issued,     setIssued]     = useState(null)
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState(null)
  const [expanded,   setExpanded]   = useState({})
  const [doneIds,    setDoneIds]    = useState(new Set())

  useEffect(() => {
    async function load() {
      try {
        const [a, i] = await Promise.all([
          listApplications({ status: 'approved',            limit: 100, sort_order: '-1' }),
          listApplications({ status: 'certificate_issued',  limit: 100, sort_order: '-1' }),
        ])
        setApproved(a)
        setIssued(i)
      } catch {
        setError('Failed to load applications.')
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  function handleSuccess(appId) {
    setDoneIds((prev) => new Set([...prev, appId]))
    setExpanded((prev) => ({ ...prev, [appId]: false }))
  }

  const pendingApps = (approved?.data ?? []).filter((a) => !doneIds.has(a.application_id))

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">

      <nav className="text-sm text-forest-400 mb-6">
        <Link href="/staff" className="hover:text-forest-700">Staff Console</Link>
        <span className="mx-2">›</span>
        <span className="text-forest-700 font-medium">Certificate Issuance</span>
      </nav>

      <h1 className="text-2xl font-bold text-forest-900 mb-1">Certificate Issuance</h1>
      <p className="text-forest-500 text-sm mb-8">
        Issue official land registration certificates for approved applications.
      </p>

      {loading && <div className="text-center py-16 text-forest-400 text-sm">Loading…</div>}
      {error   && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-5 py-4 text-sm mb-6">{error}</div>}

      {/* Approved — awaiting certificate */}
      {!loading && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-4">
            Approved — Awaiting Certificate
            {pendingApps.length > 0 && (
              <span className="ml-2 bg-forest-100 text-forest-800 text-xs px-2 py-0.5 rounded-full font-normal">{pendingApps.length}</span>
            )}
          </h2>

          {pendingApps.length === 0 && (
            <div className="bg-parchment border border-earth-200 rounded-xl px-5 py-6 text-sm text-earth-700 text-center">
              No applications pending certificate issuance.
            </div>
          )}

          <div className="space-y-3">
            {pendingApps.map((app) => (
              <div key={app.application_id} className="bg-white border border-forest-100 rounded-2xl shadow-sm overflow-hidden">
                <div className="px-5 py-4 flex flex-wrap items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-1">
                      <span className="font-mono text-sm font-bold text-forest-800">{app.application_id}</span>
                      <StatusBadge status={app.status} size="sm" />
                    </div>
                    <p className="text-sm text-forest-600 capitalize">{app.application_type?.replace(/_/g, ' ')}</p>
                    <p className="text-xs text-forest-400 mt-0.5">
                      Applicant: {app.applicant_ref?.applicant_id} · Zone {app.parcel_ref?.zone_id}
                    </p>
                    <p className="text-xs text-forest-300 mt-0.5">Approved: {fmt(app.timestamps?.approved_at)}</p>
                  </div>
                  <div className="flex gap-2 items-center shrink-0">
                    <Link
                      href={`/staff/application/${app.application_id}`}
                      className="text-xs text-earth-600 underline hover:text-earth-800"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => setExpanded((prev) => ({ ...prev, [app.application_id]: !prev[app.application_id] }))}
                      className="bg-forest-700 hover:bg-forest-800 text-white text-xs px-3 py-1.5 rounded-lg font-medium transition-colors"
                    >
                      {expanded[app.application_id] ? 'Cancel' : 'Issue Certificate'}
                    </button>
                  </div>
                </div>

                {expanded[app.application_id] && (
                  <div className="border-t border-forest-100 px-5 pb-5">
                    <IssueForm app={app} onSuccess={handleSuccess} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Already issued */}
      {!loading && issued?.data.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-4">
            Certificate Issued
            <span className="ml-2 bg-earth-100 text-earth-800 text-xs px-2 py-0.5 rounded-full font-normal">{issued.total}</span>
          </h2>

          <div className="space-y-2">
            {issued.data.map((app) => (
              <Link
                key={app.application_id}
                href={`/staff/application/${app.application_id}`}
                className="flex items-center gap-4 bg-white border border-forest-100 rounded-xl px-5 py-3 shadow-sm hover:shadow-md hover:border-earth-300 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <span className="font-mono text-sm font-bold text-forest-800">{app.application_id}</span>
                  <p className="text-xs text-forest-400 mt-0.5">
                    {app.application_type?.replace(/_/g, ' ')} · Applicant {app.applicant_ref?.applicant_id}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-xs text-forest-400">Issued {fmt(app.timestamps?.certificate_issued_at)}</p>
                  <StatusBadge status={app.status} size="sm" />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
