'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { loginApplicant } from '@/lib/api'
import { saveAuth } from '@/lib/auth'

export default function LoginPage() {
  const router = useRouter()
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState(null)

  async function handleSubmit(e) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    try {
      const data = await loginApplicant(email, password)
      saveAuth(data.access_token, data.user)
      router.push('/applicant')
    } catch (err) {
      setError(err?.detail ?? 'Login failed. Check your email and password.')
    } finally {
      setLoading(false)
    }
  }

  const inputCls = 'w-full border border-forest-200 rounded-lg px-4 py-2.5 text-forest-900 bg-white focus:outline-none focus:ring-2 focus:ring-forest-400'

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="bg-white border border-forest-100 rounded-2xl shadow-sm p-8">
        <h1 className="text-2xl font-bold text-forest-900 mb-1">Sign In</h1>
        <p className="text-forest-500 text-sm mb-8">Access your land registration applications.</p>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-1">Email</label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-forest-800 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              placeholder="••••••••"
              className={inputCls}
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-forest-700 hover:bg-forest-800 text-white font-semibold py-2.5 rounded-lg transition-colors disabled:opacity-50"
          >
            {loading ? 'Signing in…' : 'Sign In'}
          </button>
        </form>

        <p className="text-center text-sm text-forest-500 mt-6">
          Don&apos;t have an account?{' '}
          <Link href="/applicant/register" className="text-forest-700 font-semibold hover:underline">
            Create one
          </Link>
        </p>
      </div>
    </div>
  )
}
