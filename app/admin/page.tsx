import React from 'react'
import { redirect } from 'next/navigation'
import { getUserAction, signOutAction } from '../auth-actions'
import { createAdminClient } from '@/utils/supabase/admin-supabase'
import { Shield, Users, CreditCard, Building, ShieldAlert, LogOut } from 'lucide-react'
import { getUnitsAction } from './admin-actions'
import AdminUserManager from './admin-user-manager'

export const metadata = {
  title: 'YKBS Labs ID Card Generator - Admin Dashboard',
  description: 'Manage users, units, and roles for the ID Card Portal.',
}

function getUnitName(units: any): string {
  if (!units) return 'Unassigned'
  if (Array.isArray(units)) {
    return units[0]?.nama || 'Unassigned'
  }
  return units.nama || 'Unassigned'
}

export default async function AdminDashboardPage() {
  // Check auth and role
  const { user } = await getUserAction()

  if (!user) {
    redirect('/login')
  }

  if (user.detail?.role !== 'admin') {
    redirect('/form')
  }

  const handleSignOut = async () => {
    'use server'
    await signOutAction()
  }

  // Use admin client to bypass RLS and fetch ALL user details
  const adminDb = createAdminClient()
  const { data: userDetails, error } = await adminDb
    .from('user_details')
    .select('id, user_id, unit_id, role, created_at, units ( id, nama )')
    .order('created_at', { ascending: false })

  // Fetch auth users for email/name data (using admin client)
  let authUsersMap: Record<string, { email: string; name: string }> = {}
  try {
    const admin = createAdminClient()
    const { data: authData } = await admin.auth.admin.listUsers()
    if (authData?.users) {
      for (const u of authData.users) {
        authUsersMap[u.id] = {
          email: u.email || '',
          name: u.user_metadata?.name || '',
        }
      }
    }
  } catch {
    // Service role key not set — fall back to user_id only
  }

  // Merge user details with auth data
  const usersList = (userDetails || []).map(ud => ({
    ...ud,
    id: String(ud.id),
    email: authUsersMap[ud.user_id]?.email || '',
    name: authUsersMap[ud.user_id]?.name || '',
  }))

  // Fetch units for the manager component
  const { units } = await getUnitsAction()

  // Calculate statistics
  const totalUsers = usersList.length
  const totalAdmins = usersList.filter(u => u.role === 'admin').length
  const totalIT = usersList.filter(u => getUnitName(u.units) === 'IT').length
  const totalYayasan = usersList.filter(u => getUnitName(u.units) === 'Yayasan').length

  return (
    <main className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 relative overflow-hidden bg-grid-pattern py-10 px-4 md:px-8">
      {/* Background radial glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/20 rounded-full filter blur-[100px] pointer-events-none" />

      <div className="w-full max-w-5xl mx-auto z-10 flex-grow">
        {/* Header Section */}
        <header className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-8 border-b border-slate-200/80 pb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center border border-indigo-500 shadow-lg shadow-indigo-100">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">Admin Dashboard</h1>
              <p className="text-xs text-slate-500">Welcome back, {user.name || 'Administrator'}</p>
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

        {/* Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Total Users</span>
              <Users className="w-4.5 h-4.5 text-indigo-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalUsers}</div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Admins</span>
              <Shield className="w-4.5 h-4.5 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalAdmins}</div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit IT</span>
              <Building className="w-4.5 h-4.5 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalIT}</div>
          </div>

          <div className="bg-white border border-slate-200/80 p-5 rounded-2xl shadow-sm">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Unit Yayasan</span>
              <Building className="w-4.5 h-4.5 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-slate-900">{totalYayasan}</div>
          </div>
        </div>

        {/* User Management — delegated to client component */}
        <AdminUserManager users={usersList} units={units} />
      </div>

      {/* Footer disclaimer */}
      <footer className="w-full max-w-5xl mx-auto border-t border-slate-200 pt-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="text-[9px] text-slate-400 font-mono max-w-md leading-relaxed">
          Admin Area. Segala aktivitas diotorisasi dan dicatat untuk audit internal YKBS Security.
        </div>
        <div className="flex items-center gap-2 text-[9px] text-slate-500 font-mono bg-white px-3 py-1 border border-slate-200 rounded-lg shadow-sm">
          <ShieldAlert className="w-3 h-3 text-amber-500" />
          <span>YKBS SECURE CORE</span>
        </div>
      </footer>
    </main>
  )
}
