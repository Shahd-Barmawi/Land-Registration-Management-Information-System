'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/submit', label: 'Submit Application' },
  { href: '/track',  label: 'Track Application'  },
]

export default function Navbar() {
  const path = usePathname()
  return (
    <nav className="bg-forest-800 text-white shadow-lg">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3 group">
          <span className="text-2xl">🌿</span>
          <div>
            <p className="font-bold text-lg leading-none tracking-wide">LRMIS</p>
            <p className="text-forest-300 text-xs leading-none">Land Registration System</p>
          </div>
        </Link>

        <div className="flex gap-1">
          {links.map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                path === href
                  ? 'bg-forest-600 text-white'
                  : 'text-forest-100 hover:bg-forest-700'
              }`}
            >
              {label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
