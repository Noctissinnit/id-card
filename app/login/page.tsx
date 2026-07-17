'use client'

import React, { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { signInAction, getUserAction } from '../auth-actions'
import { Lock, User, CreditCard, ShieldAlert, AlertCircle, Eye, EyeOff } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Redirect if already logged in
  useEffect(() => {
    async function checkUser() {
      const { user } = await getUserAction()
      if (user) {
        if (user.detail?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/form')
        }
      } else {
        setCheckingAuth(false)
      }
    }
    checkUser()
  }, [router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    const formData = new FormData()
    formData.append('username', username)
    formData.append('password', password)

    const result = await signInAction(formData)

    if (result.error) {
      setError(result.error)
      setLoading(false)
    } else {
      // Get role of logged in user to redirect correctly
      const { user } = await getUserAction()
      if (user) {
        if (user.detail?.role === 'admin') {
          router.push('/admin')
        } else {
          router.push('/form')
        }
      } else {
        setError('Login successful, but profile could not be loaded.')
        setLoading(false)
      }
    }
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen w-full flex items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <span className="text-xs font-mono text-slate-500">Checking authentication...</span>
        </div>
      </div>
    )
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 relative overflow-hidden bg-grid-pattern py-12 px-4 md:px-8">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/20 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Main Header */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center mb-6 z-10 text-center">
        <div className="flex items-center gap-2 px-3.5 py-1 bg-white border border-slate-200/80 rounded-full mb-3 shadow-sm">
          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[10px] font-mono tracking-[3px] uppercase text-slate-600 font-semibold">ID Card Generator</span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
          YKBS SECURE PORTAL
        </h1>
      </div>

      {/* Login Box */}
      <div className="w-full max-w-md mx-auto z-10 py-6">
        <div className="bg-white border border-slate-200/80 rounded-2xl p-6 md:p-8 shadow-xl shadow-slate-100/60">
          <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center mb-5 border border-indigo-100">
            <Lock className="w-6 h-6 text-indigo-600" />
          </div>

          <h2 className="text-xl font-bold text-slate-900 mb-1">
            Sign In
          </h2>
          <p className="text-slate-400 text-xs mb-6">
            Masukkan username dan password resmi Anda untuk melanjutkan
          </p>

          {error && (
            <div className="mb-5 p-3.5 bg-red-50 border border-red-200/60 rounded-xl text-red-700 flex gap-2.5 items-start">
              <AlertCircle className="w-4.5 h-4.5 shrink-0 mt-0.5" />
              <div className="text-xs font-medium">{error}</div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                Username
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <User className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  id="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Masukkan username"
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none"
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="text-[10px] font-semibold text-slate-700 uppercase tracking-wider block">
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  id="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-10 pr-10 py-2.5 bg-slate-50/50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 rounded-xl text-xs text-slate-900 transition outline-none"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-slate-600 transition"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white font-medium rounded-xl text-xs transition shadow-md shadow-indigo-100 hover:shadow-indigo-200 flex items-center justify-center gap-2"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                'Masuk ke Portal'
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer Disclaimer */}
      <div className="w-full max-w-5xl mx-auto mt-6 z-10 border-t border-slate-200 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="text-[9px] text-slate-400 font-mono max-w-md leading-relaxed">
          Kredensial login Anda diamankan menggunakan sistem enkripsi tingkat tinggi di bawah lisensi YKBS. Hubungi Administrator IT jika Anda lupa kata sandi.
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono bg-white px-3 py-1 border border-slate-200 rounded-lg shadow-sm">
          <ShieldAlert className="w-3 h-3 text-amber-500" />
          <span>Internal Use Only</span>
        </div>
      </div>
    </main>
  )
}
