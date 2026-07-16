'use server'

import { createAdminClient } from '@/utils/supabase/admin-supabase'
import { createClient } from '@/utils/supabase/server'
import { revalidatePath } from 'next/cache'

// ── Helper: verify the caller is an admin ────────────────────────────
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Not authenticated')

  const { data: detail } = await supabase
    .from('user_details')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (detail?.role !== 'admin') throw new Error('Not authorized')
  return user
}

// ── Get all units (for dropdown) ─────────────────────────────────────
export async function getUnitsAction() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('units')
    .select('id, nama')
    .order('nama')

  if (error) return { error: error.message, units: [] }
  return { units: data || [] }
}

// ── CREATE user ──────────────────────────────────────────────────────
export async function createUserAction(formData: FormData) {
  try {
    await requireAdmin()

    const email = formData.get('email') as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null

    if (!email || !password) {
      return { error: 'Email dan password wajib diisi.' }
    }
    if (password.length < 6) {
      return { error: 'Password minimal 6 karakter.' }
    }

    const admin = createAdminClient()

    // 1. Create auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // auto-confirm email
      user_metadata: { name: name || '' },
    })

    if (authError) {
      return { error: authError.message }
    }

    // 2. Insert user_details row
    const { error: detailError } = await admin
      .from('user_details')
      .insert({
        user_id: authData.user.id,
        unit_id: unitId,
        role: 'user', // Always create as regular user
      })

    if (detailError) {
      // Rollback: delete the auth user we just created
      await admin.auth.admin.deleteUser(authData.user.id)
      return { error: `Gagal menyimpan detail user: ${detailError.message}` }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan.' }
  }
}

// ── UPDATE user ──────────────────────────────────────────────────────
export async function updateUserAction(formData: FormData) {
  try {
    await requireAdmin()

    const userDetailId = formData.get('id') as string
    const userId = formData.get('user_id') as string
    const name = formData.get('name') as string
    const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null

    if (!userDetailId || !userId) {
      return { error: 'Data user tidak valid.' }
    }

    const admin = createAdminClient()

    // Prevent editing admin users
    const { data: target } = await admin
      .from('user_details')
      .select('role')
      .eq('id', userDetailId)
      .single()

    if (target?.role === 'admin') {
      return { error: 'Tidak bisa mengedit user admin.' }
    }

    // 1. Update user metadata (name) and optionally password
    const updatePayload: any = {
      user_metadata: { name: name || '' },
    }
    
    const password = formData.get('password') as string
    if (password && password.trim() !== '') {
      if (password.length < 6) {
        return { error: 'Password minimal berisi 6 karakter.' }
      }
      updatePayload.password = password
    }

    const { error: authError } = await admin.auth.admin.updateUserById(userId, updatePayload)

    if (authError) {
      return { error: authError.message }
    }

    // 2. Update user_details
    const { error: detailError } = await admin
      .from('user_details')
      .update({ unit_id: unitId })
      .eq('id', userDetailId)

    if (detailError) {
      return { error: detailError.message }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan.' }
  }
}

// ── DELETE user ──────────────────────────────────────────────────────
export async function deleteUserAction(userDetailId: string, userId: string) {
  try {
    await requireAdmin()

    if (!userDetailId || !userId) {
      return { error: 'Data user tidak valid.' }
    }

    const admin = createAdminClient()

    // Prevent deleting admin users
    const { data: target } = await admin
      .from('user_details')
      .select('role')
      .eq('id', userDetailId)
      .single()

    if (target?.role === 'admin') {
      return { error: 'Tidak bisa menghapus user admin.' }
    }

    // 1. Delete user_details first
    const { error: detailError } = await admin
      .from('user_details')
      .delete()
      .eq('id', userDetailId)

    if (detailError) {
      return { error: detailError.message }
    }

    // 2. Delete auth user
    const { error: authError } = await admin.auth.admin.deleteUser(userId)

    if (authError) {
      return { error: `User detail terhapus, tapi gagal menghapus auth user: ${authError.message}` }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan.' }
  }
}
