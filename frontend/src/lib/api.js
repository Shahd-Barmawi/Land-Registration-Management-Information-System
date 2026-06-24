const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function authHeader() {
  if (typeof window === 'undefined') return {}
  const token = localStorage.getItem('lrmis_token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

async function request(path, { headers: extraHeaders, ...rest } = {}) {
  const res = await fetch(`${BASE}${path}`, {
    headers: { 'Content-Type': 'application/json', ...authHeader(), ...extraHeaders },
    ...rest,
  })
  const data = await res.json()
  if (!res.ok) throw data
  return data
}

// Auth
export const registerApplicant = (body) =>
  request('/auth/register', { method: 'POST', body: JSON.stringify(body) })

export const loginApplicant = (email, password) =>
  request('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) })

export const getMe = () => request('/auth/me')

// Applications
export const createApplication = (body, idempotencyKey) =>
  request('/applications/', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: idempotencyKey ? { 'Idempotency-Key': idempotencyKey } : {},
  })

export const getApplication = (id) => request(`/applications/${id}`)

export const listApplications = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString()
  return request(`/applications/?${qs}`)
}

export const transitionApplication = (id, body) =>
  request(`/applications/${id}/transition`, { method: 'PATCH', body: JSON.stringify(body) })

export const holdApplication = (id, body) =>
  request(`/applications/${id}/hold`, { method: 'POST', body: JSON.stringify(body) })

export const rejectApplication = (id, body) =>
  request(`/applications/${id}/reject`, { method: 'POST', body: JSON.stringify(body) })

export const issueCertificate = (id, body) =>
  request(`/applications/${id}/certificate`, { method: 'POST', body: JSON.stringify(body) })

// Real file upload via GridFS
export const uploadDocument = (appId, documentType, file) => {
  const form = new FormData()
  form.append('document_type', documentType)
  form.append('file', file)
  return fetch(`${BASE}/applications/${appId}/documents/upload`, {
    method: 'POST',
    body: form,
    // No Content-Type header — browser sets multipart boundary automatically
  }).then(async (res) => {
    const data = await res.json()
    if (!res.ok) throw data
    return data
  })
}

export const documentUrl = (appId, fileId) =>
  `${BASE}/applications/${appId}/documents/${fileId}`

// Metadata-only document add (Module 2 endpoint — stub until implemented)
export const addDocument = (id, body) =>
  request(`/applications/${id}/documents`, { method: 'POST', body: JSON.stringify(body) })

// Objections (Module 2 endpoint — stub until implemented)
export const submitObjection = (id, body) =>
  request(`/applications/${id}/objections`, { method: 'POST', body: JSON.stringify(body) })

// Timeline (Module 2 endpoint — stub until implemented)
export const getTimeline = (id) => request(`/applications/${id}/timeline`)

// Parcels
export const createParcel = (body) =>
  request('/parcels/', { method: 'POST', body: JSON.stringify(body) })

export const getParcel = (id) => request(`/parcels/${id}`)

// Staff — internal notes
export const addNote = (id, body) =>
  request(`/applications/${id}/notes`, { method: 'POST', body: JSON.stringify(body) })

// Staff — document status (verified | rejected | missing | pending_review | pending)
export const updateDocumentStatus = (id, documentType, body) =>
  request(`/applications/${id}/documents/${encodeURIComponent(documentType)}/status`, {
    method: 'PATCH',
    body: JSON.stringify(body),
  })

// Staff — Module 3
export const createStaff = (body) =>
  request('/staff/', { method: 'POST', body: JSON.stringify(body) })

export const listStaff = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString()
  return request(`/staff/?${qs}`)
}

export const getStaff = (staffId) => request(`/staff/${staffId}`)

// Survey — Module 3
export const autoAssignSurveyor = (appId) =>
  request(`/applications/${appId}/auto-assign-surveyor`, { method: 'POST' })

export const updateSurveyMilestone = (appId, body) =>
  request(`/applications/${appId}/survey-milestone`, { method: 'PATCH', body: JSON.stringify(body) })

export const submitSurveyReport = (appId, body) =>
  request(`/applications/${appId}/survey-report`, { method: 'POST', body: JSON.stringify(body) })

export const registrarReview = (appId, body) =>
  request(`/applications/${appId}/registrar-review`, { method: 'PATCH', body: JSON.stringify(body) })

export const getSurveyTask = (appId) =>
  request(`/applications/${appId}/survey-task`)

// Analytics — Module 4
export const getAnalyticsKpis = () => request('/analytics/kpis')
export const getApplicationsByStatus = () => request('/analytics/applications-by-status')
export const getApplicationsByZone = () => request('/analytics/applications-by-zone')
export const getProcessingTime = () => request('/analytics/processing-time')
export const getSurveyorsAnalytics = () => request('/analytics/surveyors')
export const getRegistrarsAnalytics = () => request('/analytics/registrars')
export const getParcelGeofeed = (params = {}) => {
  const qs = new URLSearchParams(
    Object.fromEntries(Object.entries(params).filter(([, v]) => v != null))
  ).toString()
  return request(`/analytics/geofeeds/parcels?${qs}`)
}
export const getPendingHeatmap = () => request('/analytics/geofeeds/pending-heatmap')

// Legacy alias kept for backward compat
export const getAnalyticsSummary = () => request('/analytics/kpis')
