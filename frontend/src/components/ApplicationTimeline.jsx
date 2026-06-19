import StatusBadge from './StatusBadge'

const EVENT_ICONS = {
  submitted:          '📋',
  pre_checked:        '✅',
  survey_required:    '🗺️',
  surveyed:           '📐',
  legal_review:       '⚖️',
  approved:           '✔️',
  certificate_issued: '🏅',
  closed:             '🔒',
  rejected:           '❌',
  on_hold:            '⏸️',
  missing_documents:  '📄',
  under_objection:    '⚠️',
}

function fmt(dateStr) {
  if (!dateStr) return '—'
  return new Date(dateStr).toLocaleString('en-GB', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default function ApplicationTimeline({ application }) {
  const ts = application?.timestamps ?? {}

  const events = [
    { state: 'submitted',          at: ts.submitted_at },
    { state: 'pre_checked',        at: ts.pre_checked_at },
    { state: 'survey_required',    at: ts.survey_required_at },
    { state: 'surveyed',           at: ts.surveyed_at },
    { state: 'legal_review',       at: ts.legal_review_at },
    { state: 'approved',           at: ts.approved_at },
    { state: 'certificate_issued', at: ts.certificate_issued_at },
    { state: 'closed',             at: ts.closed_at },
  ].filter((e) => e.at)

  if (!events.length) return <p className="text-forest-400 text-sm">No timeline events yet.</p>

  return (
    <ol className="relative border-l-2 border-forest-200 ml-4 space-y-6">
      {events.map((e, i) => (
        <li key={i} className="ml-6">
          <span className="absolute -left-4 flex h-8 w-8 items-center justify-center rounded-full bg-parchment border-2 border-forest-300 text-base">
            {EVENT_ICONS[e.state] ?? '•'}
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={e.state} />
            <time className="text-xs text-forest-400">{fmt(e.at)}</time>
          </div>
        </li>
      ))}
    </ol>
  )
}
