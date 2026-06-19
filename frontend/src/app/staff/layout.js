'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const NAV = [
  { href: '/staff',               label: 'Dashboard' },
  { href: '/staff/applications',  label: 'Applications' },
]

function StaffNav() {
  const path = usePathname()
  return (
    <nav className="bg-earth-800 text-white">
      <div className="max-w-6xl mx-auto px-6 flex items-center justify-between h-14">
        <Link href="/staff" className="font-bold text-earth-100 text-sm tracking-wide">
          LRMIS · Staff Console
        </Link>
        <div className="flex gap-1">
          {NAV.map((n) => (
            <Link
              key={n.href}
              href={n.href}
              className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                path === n.href || (n.href !== '/staff' && path.startsWith(n.href))
                  ? 'bg-earth-600 text-white'
                  : 'text-earth-200 hover:bg-earth-700'
              }`}
            >
              {n.label}
            </Link>
          ))}
        </div>
        <Link href="/" className="text-xs text-earth-400 hover:text-earth-200">← Portals</Link>
      </div>
    </nav>
  )
}

export default function StaffLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col bg-cream">
      <StaffNav />
      <main className="flex-1">{children}</main>
      <footer className="bg-earth-900 text-earth-300 text-center text-xs py-3">
        © 2026 LRMIS — Staff Console
      </footer>
    </div>
  )
}
