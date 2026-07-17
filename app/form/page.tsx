import React from 'react'
import { redirect } from 'next/navigation'
import { getUserAction, signOutAction } from '../auth-actions'
import { getSession } from '../actions'
import IDCardForm from '../id-card-form'
import IDCardPreview from '../id-card-preview'
import { ShieldAlert, CreditCard, LogOut, User, Building } from 'lucide-react'

export const metadata = {
  title: 'YKBS Labs ID Card Generator - Form',
  description: 'Generate and print high-quality professional ID cards for your unit.',
}

function getUnitName(units: any): string {
  if (!units) return 'Unassigned'
  if (Array.isArray(units)) {
    return units[0]?.nama || 'Unassigned'
  }
  return units.nama || 'Unassigned'
}

function getUnitTemplate(units: any) {
  if (!units) return null
  if (Array.isArray(units)) {
    return units[0] || null
  }
  return units
}

export default async function FormPage() {
  const { user } = await getUserAction()

  if (!user) {
    redirect('/login')
  }

  // If user is admin, redirect to admin dashboard
  if (user.detail?.role === 'admin') {
    redirect('/admin')
  }

  // Get active session if card is already generated
  const session = await getSession()

  const handleSignOut = async () => {
    'use server'
    await signOutAction()
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 relative overflow-hidden bg-grid-pattern py-10 px-4 md:px-8">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/20 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto z-10 flex-grow">
        {/* User Portal Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-200/85 pb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
              <User className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-950">ID Card Generation Portal</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-semibold">
                  {user.detail?.username || (user.email && user.email.endsWith('@idcard.local') ? user.email.split('@')[0] : (user.name || 'User'))}
                </span>
                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-600 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                  <Building className="w-2.5 h-2.5" />
                  Unit: {getUnitName(user.detail?.units)}
                </span>
              </div>
            </div>
          </div>

          <form action={handleSignOut}>
            <button
              type="submit"
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm"
            >
              <LogOut className="w-3.5 h-3.5" />
              Sign Out
            </button>
          </form>
        </header>

        {/* Form or Preview display */}
        <div className="w-full flex justify-center items-center">
          {!session ? (
            <IDCardForm defaultUnit={getUnitName(user.detail?.units)} customTemplate={getUnitTemplate(user.detail?.units)} />
          ) : (
            <IDCardPreview data={session} customTemplate={getUnitTemplate(user.detail?.units)} />
          )}
        </div>
      </div>

      {/* Footer Disclaimer */}
      <footer className="w-full max-w-5xl mx-auto mt-12 z-10 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="text-[10px] text-slate-500 font-mono max-w-md leading-relaxed">
          Sistem Generator ID Card ini beroperasi dengan otorisasi keamanan Supabase. Data cookie disimpan di memori sesi terenkripsi.
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-sm">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Internal Use Only &bull; ISSUER: YKBS SECURITY DEPT</span>
        </div>
      </footer>
    </main>
  )
}
