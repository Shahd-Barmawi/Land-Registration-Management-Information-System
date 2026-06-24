'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { registerApplicant } from '@/lib/api'
import { saveAuth } from '@/lib/auth'

const inputCls = 'w-full border border-forest-200 rounded-lg px-4 py-2.5 text-forest-900 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400'

function Field({ label, required, children }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-forest-800 mb-1">
        {label}{required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {children}
    </div>
  )
}

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({
    full_name:      '',
    email:          '',
    password:       '',
    confirm:        '',
    national_id:    '',
    phone:          '',
    applicant_type: 'citizen',
    city:           '',
  })
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState(null)

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  async function handleSubmit(e) {
    e.preventDefault()
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const { confirm, ...body } = form
      const data = await registerApplicant(body)
      saveAuth(data.access_token, data.user)
      router.push('/applicant')
    } catch (err) {
      setError(err?.detail ?? 'Registration failed. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-lg mx-auto px-6 py-12">
      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-forest-900 mb-1">Create Account</h1>
        <p className="text-forest-500 text-sm mb-8">
          Register to submit and track land registration applications.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Full Name" required>
            <input
              className={inputCls}
              placeholder="As it appears on your ID"
              value={form.full_name}
              onChange={e => set('full_name', e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="National ID" required>
              <input
                className={inputCls}
                placeholder="e.g. 400000000"
                value={form.national_id}
                onChange={e => set('national_id', e.target.value)}
                required
              />
            </Field>
            <Field label="Applicant Type">
              <select
                className={inputCls}
                value={form.applicant_type}
                onChange={e => set('applicant_type', e.target.value)}
              >
                {['citizen','lawyer','company','authorized_representative'].map(t => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
            </Field>
          </div>

          <Field label="Email" required>
            <input
              type="email"
              className={inputCls}
              placeholder="you@example.com"
              value={form.email}
              onChange={e => set('email', e.target.value)}
              required
            />
          </Field>

          <div className="grid grid-cols-2 gap-4">
            <Field label="Phone">
              <input
                className={inputCls}
                placeholder="+970 …"
                value={form.phone}
                onChange={e => set('phone', e.target.value)}
              />
            </Field>
            <Field label="City">
              <input
                className={inputCls}
                placeholder="e.g. Ramallah"
                value={form.city}
                onChange={e => set('city', e.target.value)}
              />
            </Field>
          </div>

          <Field label="Password" required>
            <input
              type="password"
              className={inputCls}
              placeholder="At least 6 characters"
              value={form.password}
              onChange={e => set('password', e.target.value)}
              required
            />
          </Field>

          <Field label="Confirm Password" required>
            <input
              type="password"
              className={inputCls}
              placeholder="Repeat password"
              value={form.confirm}
              onChange={e => set('confirm', e.target.value)}
              required
            />
          </Field>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest-700 hover:bg-forest-800 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50 mt-2"
          >
            {loading ? 'Creating account…' : 'Create Account'}
          </button>
        </form>

        <p className="text-center text-sm text-forest-500 mt-6">
          Already have an account?{' '}
          <Link href="/applicant/login" className="text-forest-700 font-semibold hover:underline">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
