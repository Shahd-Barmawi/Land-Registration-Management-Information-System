const STYLES = {
  submitted:          'bg-forest-100 text-forest-800',
  pre_checked:        'bg-earth-100  text-earth-800',
  survey_required:    'bg-yellow-100 text-yellow-800',
  surveyed:           'bg-teal-100   text-teal-800',
  legal_review:       'bg-purple-100 text-purple-800',
  approved:           'bg-forest-500 text-white',
  certificate_issued: 'bg-forest-800 text-white',
  closed:             'bg-gray-200   text-gray-600',
  rejected:           'bg-red-100    text-red-800',
  on_hold:            'bg-orange-100 text-orange-800',
  missing_documents:  'bg-yellow-100 text-yellow-800',
  under_objection:    'bg-red-100    text-red-700',
}

const LABELS = {
  submitted:          'Submitted',
  pre_checked:        'Pre-Checked',
  survey_required:    'Survey Required',
  surveyed:           'Surveyed',
  legal_review:       'Legal Review',
  approved:           'Approved',
  certificate_issued: 'Certificate Issued',
  closed:             'Closed',
  rejected:           'Rejected',
  on_hold:            'On Hold',
  missing_documents:  'Missing Documents',
  under_objection:    'Under Objection',
}

export default function StatusBadge({ status, size = 'md' }) {
  const cls = STYLES[status] ?? 'bg-gray-100 text-gray-700'
  const text = size === 'lg' ? 'text-sm px-4 py-1.5' : 'text-xs px-3 py-1'
  return (
    <span className={`inline-flex items-center rounded-full font-semibold ${cls} ${text}`}>
      {LABELS[status] ?? status}
    </span>
  )
}
