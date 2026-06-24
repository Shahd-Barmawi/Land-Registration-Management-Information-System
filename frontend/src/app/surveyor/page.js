import Link from 'next/link'

const ACTIONS = [
  {
    href:  '/surveyor/tasks',
    title: 'My Survey Tasks',
    desc:  'View and execute field survey assignments. Track milestones, add notes, and submit reports.',
    icon:  '📋',
  },
  {
    href:  '/surveyor/map',
    title: 'Live Parcel Map',
    desc:  'View all registered parcels and active survey assignments on an interactive map.',
    icon:  '🗺️',
  },
  {
    href:  '/surveyor/analytics',
    title: 'Analytics Dashboard',
    desc:  'Operational insights: application volume, average processing time, status distribution.',
    icon:  '📊',
  },
]

export default function SurveyorDashboard() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold text-forest-900 mb-2">Surveyor Portal</h1>
      <p className="text-forest-500 mb-10">
        Manage field survey tasks, monitor the live parcel map, and review operational analytics.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group bg-white border-2 border-forest-200 hover:border-forest-600 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
          >
            <span className="text-3xl block mb-4">{a.icon}</span>
            <h2 className="font-bold text-forest-900 text-base mb-1">{a.title}</h2>
            <p className="text-sm text-forest-500 leading-relaxed">{a.desc}</p>
            <span className="mt-4 block text-sm font-semibold text-forest-700 group-hover:underline">
              Go →
            </span>
          </Link>
        ))}
      </div>
    </div>
  )
}
