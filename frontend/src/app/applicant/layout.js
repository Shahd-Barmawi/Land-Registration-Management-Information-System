'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/applicant',         label: 'Dashboard' },
  { href: '/applicant/submit',  label: 'New Application' },
  { href: '/applicant/track',   label: 'Track Application' },
]

function ApplicantNav() {
  const path = usePathname()
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
        <Link href="/" className="text-xs text-forest-400 hover:text-forest-200">← Portals</Link>
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
