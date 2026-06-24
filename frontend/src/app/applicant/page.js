'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { getUser, isLoggedIn } from '@/lib/auth'
import { listApplications } from '@/lib/api'
import StatusBadge from '@/components/StatusBadge'

function fmt(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function ApplicantDashboard() {
  const router  = useRouter()
  const [user,  setUser]  = useState(null)
  const [apps,  setApps]  = useState([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (!isLoggedIn()) {
      router.replace('/applicant/login')
      return
    }
    const u = getUser()
    setUser(u)

    listApplications({ applicant_id: u.applicant_id, limit: 5, sort_order: '-1' })
      .then(res => setApps(res.data ?? []))
      .catch(() => {})
      .finally(() => setReady(true))
  }, [router])

  if (!ready) return (
    <div className="flex items-center justify-center min-h-64 text-forest-400">Loading…</div>
  )

  return (
    <div className="max-w-3xl mx-auto px-6 py-10">

      {/* Welcome banner */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-forest-900 mb-1">
          Welcome, {user?.full_name?.split(' ')[0]}
        </h1>
        <p className="text-forest-500 text-sm">
          Applicant ID: <span className="font-mono text-forest-700">{user?.applicant_id}</span>
        </p>
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-10">
        <Link
          href="/applicant/submit"
          className="group bg-forest-700 hover:bg-forest-800 text-white rounded-2xl p-6 shadow-sm transition-all"
        >
          <span className="text-2xl block mb-3">📋</span>
          <h2 className="font-bold text-base mb-1">Submit New Application</h2>
          <p className="text-sm text-forest-200 leading-relaxed">
            Register a land parcel — first registration, transfer, subdivision, or merger.
          </p>
          <span className="mt-4 block text-sm font-semibold text-forest-300 group-hover:text-white">
            Start →
          </span>
        </Link>

        <Link
          href="/applicant/track"
          className="group bg-white border-2 border-forest-200 hover:border-forest-400 rounded-2xl p-6 shadow-sm transition-all"
        >
          <span className="text-2xl block mb-3">🔍</span>
          <h2 className="font-bold text-forest-900 text-base mb-1">My Applications</h2>
          <p className="text-sm text-forest-500 leading-relaxed">
            View the status and full history of all your submitted applications.
          </p>
          <span className="mt-4 block text-sm font-semibold text-forest-700 group-hover:underline">
            View all →
          </span>
        </Link>
      </div>

      {/* Recent applications */}
      {apps.length > 0 && (
        <div>
          <h2 className="text-sm font-semibold text-forest-700 uppercase tracking-wide mb-4">
            Recent Applications
          </h2>
          <div className="space-y-3">
            {apps.map(app => (
              <Link
                key={app.application_id}
                href={`/applicant/application/${app.application_id}`}
                className="flex items-center gap-4 bg-white border border-forest-100 rounded-xl px-5 py-4 hover:shadow-md hover:border-forest-300 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-mono text-sm font-bold text-forest-800">{app.application_id}</p>
                  <p className="text-xs text-forest-500 mt-0.5 capitalize">
                    {app.application_type?.replace(/_/g, ' ')} · {app.parcel_ref?.zone_id}
                  </p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs text-forest-400">{fmt(app.timestamps?.submitted_at)}</span>
                  <StatusBadge status={app.status} size="sm" />
                </div>
              </Link>
            ))}
          </div>
          <div className="text-center mt-4">
            <Link href="/applicant/track" className="text-sm text-forest-600 hover:underline font-medium">
              View all applications →
            </Link>
          </div>
        </div>
      )}

      {ready && apps.length === 0 && (
        <div className="bg-earth-50 border border-earth-200 rounded-xl p-6 text-center">
          <p className="text-earth-700 font-medium mb-1">No applications yet</p>
          <p className="text-sm text-earth-600">
            Submit your first application to get started.
          </p>
        </div>
      )}
    </div>
  )
}
