import Link from 'next/link'

const ACTIONS = [
  {
    href:  '/applicant/submit',
    title: 'Submit New Application',
    desc:  'Register a new land parcel — first registration, transfer, subdivision, or merger.',
    icon:  '📋',
  },
  {
    href:  '/applicant/track',
    title: 'Track My Applications',
    desc:  'View the status and full history of all your submitted applications.',
    icon:  '🔍',
  },
]

export default function ApplicantDashboard() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-14">
      <h1 className="text-3xl font-bold text-forest-900 mb-2">Applicant Portal</h1>
      <p className="text-forest-500 mb-10">
        Submit and track land registration applications with the Land Authority.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        {ACTIONS.map((a) => (
          <Link
            key={a.href}
            href={a.href}
            className="group bg-white border-2 border-forest-200 hover:border-forest-400 rounded-2xl p-6 shadow-sm hover:shadow-md transition-all"
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

      <div className="mt-12 bg-earth-50 border border-earth-200 rounded-xl p-5">
        <h3 className="font-semibold text-earth-800 mb-1">Need help?</h3>
        <p className="text-sm text-earth-700">
          If you have questions about your application status, contact your nearest Land Authority office.
          Always keep your <strong>application ID</strong> and <strong>national ID</strong> handy.
        </p>
      </div>
    </div>
  )
}
