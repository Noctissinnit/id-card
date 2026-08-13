import React from 'react'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getUserAction } from '../../auth-actions'
import { getSession, clearSessionAction } from '../../actions'
import { getUnitsAction } from '../admin-actions'
import IDCardForm from '../../id-card-form'
import IDCardPreview from '../../id-card-preview'
import SignOutButton from '../../../components/SignOutButton'
import { ArrowLeft, Building, ShieldAlert } from 'lucide-react'

export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'YKBS Labs ID Card Generator - Buat Kartu (Admin)',
  description: 'Admin tool to generate ID cards on behalf of any unit.',
}

export default async function AdminCreateCardPage({
  searchParams,
}: {
  searchParams: Promise<{ unit?: string }>
}) {
  const { user } = await getUserAction()

  if (!user) {
    redirect('/login')
  }

  if (user.detail?.role !== 'admin') {
    redirect('/form')
  }

  const { unit: unitIdParam } = await searchParams
  const { units } = await getUnitsAction()
  const selectedUnit = (units || []).find((u: any) => String(u.id) === String(unitIdParam)) || null

  if (!selectedUnit) {
    redirect('/admin')
  }

  // The session cookie is global (not scoped per-unit). If the admin previously
  // started a card for a different unit, clear it so switching units here always
  // starts from a clean form instead of showing a stale preview from another unit.
  let session = await getSession()
  if (session && session.departemen && session.departemen !== selectedUnit.nama) {
    await clearSessionAction()
    session = null
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 relative overflow-hidden bg-grid-pattern py-10 px-4 md:px-8">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/20 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto z-10 flex-grow">
        {/* Admin Portal Header */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-200/85 pb-6">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left">
            <div className="w-10 h-10 bg-indigo-50 border border-indigo-100 rounded-xl flex items-center justify-center">
              <Building className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-950">Buat Kartu ID — Mode Admin</h1>
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                <span className="text-[10px] bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-0.5 rounded-md font-semibold flex items-center gap-1">
                  <Building className="w-2.5 h-2.5" />
                  Unit: {selectedUnit.nama}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin"
              className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Kembali ke Admin
            </Link>
            <SignOutButton className="px-4 py-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition flex items-center gap-2 shadow-sm disabled:opacity-50" />
          </div>
        </header>

        {/* Form or Preview display */}
        <div className="w-full flex justify-center items-center">
          {!session ? (
            <IDCardForm defaultUnit={selectedUnit.nama} customTemplate={selectedUnit} />
          ) : (
            <IDCardPreview data={session} customTemplate={selectedUnit} />
          )}
        </div>
      </div>

      {/* Footer Disclaimer */}
      <footer className="w-full max-w-5xl mx-auto mt-12 z-10 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="text-[10px] text-slate-500 font-mono max-w-md leading-relaxed">
          Dibuat oleh Admin atas nama unit {selectedUnit.nama}. Data cookie disimpan di memori sesi terenkripsi.
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-sm">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Internal Use Only &bull; ISSUER: YKBS SECURITY DEPT</span>
        </div>
      </footer>
    </main>
  )
}
