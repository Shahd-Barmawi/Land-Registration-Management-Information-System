'use client'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { listApplications } from '@/lib/api'

const STATS = [
  { key: 'submitted',         label: 'Pending Pre-check',    href: '/staff/applications?status=submitted',         num: 'text-sky-700',    bg: 'bg-sky-50',    border: 'border-sky-200' },
  { key: 'legal_review',      label: 'Legal Review',         href: '/staff/applications?status=legal_review',      num: 'text-purple-700', bg: 'bg-purple-50', border: 'border-purple-200' },
  { key: 'missing_documents', label: 'Missing Documents',    href: '/staff/applications?status=missing_documents', num: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200' },
  { key: 'under_objection',   label: 'Under Objection',      href: '/staff/applications?status=under_objection',   num: 'text-rose-700',   bg: 'bg-rose-50',   border: 'border-rose-200' },
  { key: 'approved',          label: 'Awaiting Certificate', href: '/staff/certificates',                          num: 'text-forest-700', bg: 'bg-forest-50', border: 'border-forest-200' },
  { key: 'on_hold',           label: 'On Hold',              href: '/staff/applications?status=on_hold',           num: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200' },
]

export default function StaffDashboard() {
  const [counts,  setCounts]  = useState({})
  const [total,   setTotal]   = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      try {
        const [totalRes, ...rest] = await Promise.all([
          listApplications({ limit: 1 }),
          ...STATS.map((s) => listApplications({ status: s.key, limit: 1 })),
        ])
        setTotal(totalRes.total)
        const c = {}
        STATS.forEach((s, i) => { c[s.key] = rest[i].total })
        setCounts(c)
      } catch {
        // show dashes on failure
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [])

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold text-forest-900 mb-2">Staff Console</h1>
      <p className="text-forest-500 mb-8">
        Pre-check applications, review documents, manage workflow transitions, and issue certificates.
      </p>

      {/* Total banner */}
      <div className="bg-white border border-earth-200 rounded-2xl px-6 py-5 mb-6 flex items-center gap-4 shadow-sm">
        <div>
          <div className="text-4xl font-extrabold text-forest-900">
            {loading ? '…' : (total ?? '—')}
          </div>
          <div className="text-sm text-forest-500 mt-0.5">Total Applications</div>
        </div>
        <Link
          href="/staff/applications"
          className="ml-auto bg-earth-700 hover:bg-earth-800 text-white text-sm px-5 py-2 rounded-lg font-medium transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Status grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-10">
        {STATS.map((s) => (
          <Link
            key={s.key}
            href={s.href}
            className={`${s.bg} border ${s.border} rounded-xl p-4 shadow-sm hover:shadow-md transition-all group`}
          >
            <div className={`text-3xl font-bold mb-1 ${s.num}`}>
              {loading ? '…' : (counts[s.key] ?? '—')}
            </div>
            <div className="text-xs font-medium text-forest-700 group-hover:underline">{s.label}</div>
          </Link>
        ))}
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Link
          href="/staff/applications"
          className="group bg-white border-2 border-earth-200 hover:border-earth-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="text-2xl mb-3">📋</div>
          <h2 className="font-bold text-forest-900 mb-1">All Applications</h2>
          <p className="text-sm text-forest-500">Browse, search, and filter applications by status, type, zone, and priority.</p>
          <span className="mt-4 block text-sm font-semibold text-earth-700 group-hover:underline">Open →</span>
        </Link>
        <Link
          href="/staff/certificates"
          className="group bg-white border-2 border-forest-200 hover:border-forest-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
        >
          <div className="text-2xl mb-3">📜</div>
          <h2 className="font-bold text-forest-900 mb-1">Certificate Issuance</h2>
          <p className="text-sm text-forest-500">View approved applications and issue official land registration certificates.</p>
          <span className="mt-4 block text-sm font-semibold text-forest-700 group-hover:underline">Issue Certificates →</span>
        </Link>
      </div>
    </div>
  )
}
