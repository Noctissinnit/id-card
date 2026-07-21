import React from 'react'
import { redirect } from 'next/navigation'
import { getUserAction, signOutAction } from '../auth-actions'
import { createAdminClient } from '@/utils/supabase/admin-supabase'
import { Shield, Users, CreditCard, Building, ShieldAlert, LogOut } from 'lucide-react'
import { getUnitsAction } from './admin-actions'
import AdminUserManager from './admin-user-manager'

export const dynamic = 'force-dynamic'

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
  let userDetails: any = null
  let error: any = null

  try {
    const { data, error: queryError } = await adminDb
      .from('user_details')
      .select('id, user_id, unit_id, role, username, created_at, units ( id, nama )')
      .order('created_at', { ascending: false })

    if (queryError) {
      if (queryError.message.includes('column') && queryError.message.includes('username')) {
        const { data: fallbackData, error: fallbackError } = await adminDb
          .from('user_details')
          .select('id, user_id, unit_id, role, created_at, units ( id, nama )')
          .order('created_at', { ascending: false })
        userDetails = fallbackData
        error = fallbackError
      } else {
        error = queryError
      }
    } else {
      userDetails = data
    }
  } catch (err: any) {
    error = err
  }

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

  const usersList = (userDetails || []).map((ud: any) => ({
    ...ud,
    id: String(ud.id),
    email: authUsersMap[ud.user_id]?.email || '',
    name: authUsersMap[ud.user_id]?.name || '',
  }))

  // Fetch units for the manager component
  const { units } = await getUnitsAction()

  // Calculate statistics
  const totalUsers = usersList.length
  const totalAdmins = usersList.filter((u: any) => u.role === 'admin').length
  const totalIT = usersList.filter((u: any) => getUnitName(u.units) === 'IT').length
  const totalYayasan = usersList.filter((u: any) => getUnitName(u.units) === 'Yayasan').length

  return (
    <AdminUserManager 
      users={usersList} 
      units={units} 
      stats={{
        totalUsers,
        totalAdmins,
        totalIT,
        totalYayasan
      }}
      adminUsername={user.detail?.username || (user.email && user.email.endsWith('@idcard.local') ? user.email.split('@')[0] : (user.name || 'Admin'))}
    />
  )
}
