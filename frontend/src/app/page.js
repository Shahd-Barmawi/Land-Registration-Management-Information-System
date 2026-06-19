import Link from 'next/link'

const USERS = [
  {
    href:   '/applicant',
    label:  'Applicant',
    sub:    'Citizens · Lawyers · Companies · Representatives',
    desc:   'Submit land registration applications, upload ownership documents, and track your case from submission to certificate.',
    accent: 'from-forest-800 to-forest-600',
    ring:   'hover:ring-forest-400',
    cta:    'Start application →',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <rect x="6" y="10" width="36" height="28" rx="3" fill="currentColor" opacity=".15"/>
        <rect x="6" y="10" width="36" height="28" rx="3" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M14 20h20M14 26h14" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="35" cy="33" r="7" fill="#faf8f3" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M32.5 33l2 2 3-3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    ),
  },
  {
    href:   '/staff',
    label:  'Employee',
    sub:    'Registrars · Land Authority Officers',
    desc:   'Pre-check applications, review legal documents, manage workflow decisions, and issue official land registration certificates.',
    accent: 'from-earth-800 to-earth-600',
    ring:   'hover:ring-earth-400',
    cta:    'Open console →',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <path d="M24 6L6 16v4h36v-4L24 6z" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.5" strokeLinejoin="round"/>
        <rect x="10" y="20" width="5" height="18" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.5"/>
        <rect x="21.5" y="20" width="5" height="18" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.5"/>
        <rect x="33" y="20" width="5" height="18" fill="currentColor" opacity=".15" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M6 38h36" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    href:   '/surveyor',
    label:  'Surveyor',
    sub:    'Field Surveyors · Zone Managers',
    desc:   'View assigned field survey tasks, record site milestones, upload survey reports, and monitor analytics dashboards.',
    accent: 'from-forest-900 to-forest-700',
    ring:   'hover:ring-forest-500',
    cta:    'View tasks →',
    icon: (
      <svg viewBox="0 0 48 48" fill="none" className="w-10 h-10" xmlns="http://www.w3.org/2000/svg">
        <circle cx="24" cy="24" r="16" fill="currentColor" opacity=".12" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M24 8v4M24 36v4M8 24h4M36 24h4" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/>
        <circle cx="24" cy="24" r="5" fill="currentColor" opacity=".3" stroke="currentColor" strokeWidth="2.5"/>
        <path d="M24 19v-5M29 24h5" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
      </svg>
    ),
  },
]


export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-cream">

      {/* ── Hero ──────────────────────────────────────────────────────── */}
      <header className="relative overflow-hidden bg-forest-900 text-white">
        {/* Decorative grid lines */}
        <div className="absolute inset-0 opacity-5 pointer-events-none"
          style={{backgroundImage:'linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)', backgroundSize:'60px 60px'}} />

        {/* Decorative circle blobs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 rounded-full bg-earth-600 opacity-10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-80 h-80 rounded-full bg-forest-400 opacity-10 blur-3xl pointer-events-none" />

        <div className="relative max-w-5xl mx-auto px-6 pt-20 pb-24 text-center">
          <span className="inline-block text-earth-300 text-xs font-bold tracking-[0.25em] uppercase mb-5 border border-earth-600 px-4 py-1.5 rounded-full">
            Official Land Authority · COMP4382
          </span>
          <h1 className="text-5xl md:text-6xl font-extrabold leading-tight tracking-tight mb-6">
            Land Registration
            <span className="block text-earth-300 mt-1">Management System</span>
          </h1>
          <p className="text-forest-300 text-base md:text-lg max-w-2xl mx-auto leading-relaxed">
            A geo-enabled, workflow-driven platform for managing land ownership records, parcel applications,
            field surveys, registrar decisions, and official certificate issuance.
          </p>

        </div>

        {/* Wave divider */}
        <div className="relative h-12 -mb-1">
          <svg viewBox="0 0 1440 48" fill="none" xmlns="http://www.w3.org/2000/svg" className="absolute bottom-0 w-full" preserveAspectRatio="none">
            <path d="M0 48 C360 0 1080 0 1440 48 L1440 48 L0 48Z" fill="#faf8f3"/>
          </svg>
        </div>
      </header>

      {/* ── Who are you? ──────────────────────────────────────────────── */}
      <main className="flex-1 max-w-5xl mx-auto px-6 py-16 w-full">
        <div className="text-center mb-12">
          <h2 className="text-2xl font-bold text-forest-900 mb-2">Who are you?</h2>
          <p className="text-forest-500 text-sm">Select your role to access your workspace.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {USERS.map((u) => (
            <Link
              key={u.href}
              href={u.href}
              className={`group relative flex flex-col bg-white rounded-2xl shadow-sm overflow-hidden ring-2 ring-transparent transition-all duration-200 hover:shadow-xl hover:-translate-y-1 ${u.ring}`}
            >
              {/* Coloured top band */}
              <div className={`bg-gradient-to-r ${u.accent} px-6 pt-7 pb-8 text-white`}>
                <div className="mb-4 opacity-90">{u.icon}</div>
                <p className="font-bold text-base leading-snug">{u.label}</p>
                <p className="text-xs opacity-70 mt-1">{u.sub}</p>
              </div>

              {/* Body */}
              <div className="flex flex-col flex-1 px-6 py-5">
                <p className="text-sm text-forest-600 leading-relaxed flex-1">{u.desc}</p>
                <span className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-forest-700 group-hover:gap-2 transition-all">
                  {u.cta}
                </span>
              </div>
            </Link>
          ))}
        </div>

      </main>

      {/* ── Footer ────────────────────────────────────────────────────── */}
      <footer className="bg-forest-900 text-forest-400 text-center text-xs py-5">
        <p className="font-semibold text-forest-200 mb-1">LRMIS — Land Registration Management Information System</p>
        <p>© 2026 Computer Science Department · COMP4382 Final Project</p>
      </footer>
    </div>
  )
}
