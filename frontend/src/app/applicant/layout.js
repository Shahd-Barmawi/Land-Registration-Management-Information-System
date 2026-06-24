'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { getUser, clearAuth } from '@/lib/auth'

const NAV = [
  { href: '/applicant',        label: 'Dashboard' },
  { href: '/applicant/submit', label: 'New Application' },
  { href: '/applicant/track',  label: 'My Applications' },
]

function ApplicantNav() {
  const path   = usePathname()
  const router = useRouter()
  const [user, setUser] = useState(null)

  useEffect(() => { setUser(getUser()) }, [path])

  function logout() {
    clearAuth()
    router.push('/applicant/login')
  }

  return (
    <nav className="bg-forest-800 text-white">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/applicant" className="font-bold text-forest-100 text-sm tracking-wide">
          LRMIS · Applicant Portal
        </Link>

        <div className="flex gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                path === n.href ? 'bg-forest-600 text-white' : 'text-forest-200 hover:bg-forest-700'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-3">
          {user ? (
            <>
              <span className="text-xs text-forest-300 hidden sm:block">
                {user.full_name}
              </span>
              <button
                onClick={logout}
                className="text-xs text-forest-400 hover:text-white border border-forest-600 hover:border-forest-400 px-3 py-1 rounded-lg transition-colors"
              >
                Sign out
              </button>
            </>
          ) : (
            <>
              <Link href="/applicant/login"
                className="text-xs text-forest-300 hover:text-white font-medium">
                Sign in
              </Link>
              <Link href="/applicant/register"
                className="text-xs bg-forest-600 hover:bg-forest-500 text-white px-3 py-1 rounded-lg font-medium transition-colors">
                Register
              </Link>
            </>
          )}
          <Link href="/" className="text-xs text-forest-500 hover:text-forest-200 ml-1">← Portals</Link>
        </div>
      </div>
    </nav>
  )
}

export default function ApplicantLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <ApplicantNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-forest-900 text-forest-300 text-center text-xs py-3">
        © 2026 LRMIS — Applicant Portal
      </footer>
    </div>
  )
}
