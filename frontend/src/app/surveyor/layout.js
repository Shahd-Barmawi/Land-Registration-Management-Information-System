'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/surveyor',            label: 'My Tasks' },
  { href: '/surveyor/map',        label: 'Live Map' },
  { href: '/surveyor/analytics',  label: 'Analytics' },
]

function SurveyorNav() {
  const path = usePathname()
  return (
    <nav className="bg-forest-900 text-white">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/surveyor" className="font-bold text-forest-100 text-sm tracking-wide">
          LRMIS · Surveyor & Analytics
        </Link>
        <div className="flex gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                path === n.href || (n.href !== '/surveyor' && path.startsWith(n.href))
                  ? 'bg-forest-700 text-white'
                  : 'text-forest-300 hover:bg-forest-800'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <Link href="/" className="text-xs text-forest-500 hover:text-forest-300">← Portals</Link>
      </div>
    </nav>
  )
}

export default function SurveyorLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <SurveyorNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-forest-900 text-forest-300 text-center text-xs py-3">
        © 2026 LRMIS — Surveyor & Analytics
      </footer>
    </div>
  )
}
