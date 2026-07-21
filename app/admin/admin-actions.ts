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

// ── Get all units (for dropdown & management) ─────────────────────────
export async function getUnitsAction() {
  const supabase = await createClient()
  
  // Try querying with layout_config first
  let { data, error } = await supabase
    .from('units')
    .select('id, nama, card_design, card_design_back, layout_config')
    .order('nama')

  if (error) {
    // Fallback 1: layout_config might not exist yet
    const { data: fbData, error: fbError } = await supabase
      .from('units')
      .select('id, nama, card_design, card_design_back')
      .order('nama')

    if (fbError) {
      // Fallback 2: card_design / card_design_back might not exist yet
      const { data: basicData, error: basicError } = await supabase
        .from('units')
        .select('id, nama')
        .order('nama')

      if (basicError) {
        return { error: basicError.message, units: [] }
      }
      data = basicData.map(u => ({
        ...u,
        card_design: null,
        card_design_back: null,
        layout_config: null
      })) as any
    } else {
      data = fbData.map(u => ({
        ...u,
        layout_config: null
      })) as any
    }
  }
  return { units: data || [] }
}

// ── CREATE user ──────────────────────────────────────────────────────
export async function createUserAction(formData: FormData) {
  try {
    await requireAdmin()

    const username = (formData.get('username') || formData.get('email')) as string
    const password = formData.get('password') as string
    const name = formData.get('name') as string
    const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null

    if (!username || !password) {
      return { error: 'Username dan password wajib diisi.' }
    }
    if (password.length < 6) {
      return { error: 'Password minimal 6 karakter.' }
    }

    const email = username.includes('@')
      ? username.trim()
      : `${username.trim()}@idcard.local`

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

    // 2. Insert or Update user_details row (handling auto-insertion triggers if they exist)
    const { data: existingDetail } = await admin
      .from('user_details')
      .select('id')
      .eq('user_id', authData.user.id)
      .maybeSingle()

    const detailPayload: any = {
      user_id: authData.user.id,
      unit_id: unitId,
      role: 'user', // Always create as regular user
    }

    let detailError;

    if (existingDetail) {
      // If a database trigger already created the row, update it
      const { error: updateError } = await admin
        .from('user_details')
        .update({
          unit_id: unitId,
          username: username.toLowerCase().trim()
        })
        .eq('user_id', authData.user.id)

      if (updateError) {
        if (updateError.message.includes('column') && updateError.message.includes('username')) {
          const { error: retryError } = await admin
            .from('user_details')
            .update({ unit_id: unitId })
            .eq('user_id', authData.user.id)
          detailError = retryError
        } else {
          detailError = updateError
        }
      }
    } else {
      // If no trigger created it, insert a new row
      const { error: tryError } = await admin
        .from('user_details')
        .insert({
          ...detailPayload,
          username: username.toLowerCase().trim()
        })

      if (tryError) {
        if (tryError.message.includes('column') && tryError.message.includes('username')) {
          const { error: retryError } = await admin
            .from('user_details')
            .insert(detailPayload)
          detailError = retryError
        } else {
          detailError = tryError
        }
      }
    }

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
    const username = formData.get('username') as string
    const name = formData.get('name') as string
    const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : null

    if (!userDetailId || !userId) {
      return { error: 'Data user tidak valid.' }
    }

    const admin = createAdminClient()

    // Prevent editing admin users
    const { data: target } = await admin
      .from('user_details')
      .select('role, username')
      .eq('id', userDetailId)
      .single()

    if (target?.role === 'admin') {
      return { error: 'Tidak bisa mengedit user admin.' }
    }

    const newUsername = username ? username.trim().toLowerCase() : null

    // Get current auth user email to check if it's derived
    const { data: authUser } = await admin.auth.admin.getUserById(userId)
    const currentEmail = authUser?.user?.email || ''

    // 1. Update user metadata (name), password, and email
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

    // Sync auth email if username changed and current email was derived
    if (newUsername && target?.username !== newUsername && currentEmail.endsWith('@idcard.local')) {
      updatePayload.email = `${newUsername}@idcard.local`
    }

    const { error: authError } = await admin.auth.admin.updateUserById(userId, updatePayload)

    if (authError) {
      return { error: authError.message }
    }

    // 2. Update user_details
    const updateDetails: any = { unit_id: unitId }
    if (newUsername) {
      updateDetails.username = newUsername
    }

    let detailError;
    const { error: tryUpdateError } = await admin
      .from('user_details')
      .update(updateDetails)
      .eq('id', userDetailId)

    if (tryUpdateError) {
      if (tryUpdateError.message.includes('column') && tryUpdateError.message.includes('username')) {
        const { error: retryUpdateError } = await admin
          .from('user_details')
          .update({ unit_id: unitId })
          .eq('id', userDetailId)
        detailError = retryUpdateError
      } else {
        detailError = tryUpdateError
      }
    }

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

// ── CREATE unit ──────────────────────────────────────────────────────
export async function createUnitAction(formData: FormData) {
  try {
    await requireAdmin()

    const nama = formData.get('nama') as string
    const cardDesign = formData.get('card_design') as string // base64 string
    const cardDesignBack = formData.get('card_design_back') as string // base64 string
    const layoutConfig = formData.get('layout_config') as string // JSON string

    if (!nama || nama.trim() === '') {
      return { error: 'Nama unit wajib diisi.' }
    }

    const admin = createAdminClient()

    let data, error;
    
    // Try to insert with layout_config first
    const { data: tryData, error: tryError } = await admin
      .from('units')
      .insert({
        nama: nama.trim(),
        card_design: cardDesign || null,
        card_design_back: cardDesignBack || null,
        layout_config: layoutConfig ? JSON.parse(layoutConfig) : null
      })
      .select()

    if (tryError) {
      if (tryError.message.includes('column') && tryError.message.includes('layout_config')) {
        // Fallback: retry without layout_config
        const { data: retryData, error: retryError } = await admin
          .from('units')
          .insert({
            nama: nama.trim(),
            card_design: cardDesign || null,
            card_design_back: cardDesignBack || null
          })
          .select()
        data = retryData
        error = retryError
      } else {
        error = tryError
      }
    } else {
      data = tryData
    }

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin')
    return { success: true, unit: data?.[0] }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan.' }
  }
}

// ── UPDATE unit ──────────────────────────────────────────────────────
export async function updateUnitAction(formData: FormData) {
  try {
    await requireAdmin()

    const unitId = formData.get('id') ? Number(formData.get('id')) : null
    const nama = formData.get('nama') as string
    const cardDesign = formData.get('card_design') as string // base64 string or "REMOVE" or empty
    const cardDesignBack = formData.get('card_design_back') as string // base64 string or "REMOVE" or empty
    const layoutConfig = formData.get('layout_config') as string // JSON string or empty

    if (!unitId) {
      return { error: 'ID unit tidak valid.' }
    }
    if (!nama || nama.trim() === '') {
      return { error: 'Nama unit wajib diisi.' }
    }

    const admin = createAdminClient()

    const updatePayload: any = {
      nama: nama.trim()
    }

    if (cardDesign !== null && cardDesign !== undefined) {
      updatePayload.card_design = cardDesign === 'REMOVE' ? null : (cardDesign || null)
    }
    if (cardDesignBack !== null && cardDesignBack !== undefined) {
      updatePayload.card_design_back = cardDesignBack === 'REMOVE' ? null : (cardDesignBack || null)
    }
    if (layoutConfig !== null && layoutConfig !== undefined) {
      updatePayload.layout_config = layoutConfig === 'REMOVE' ? null : (layoutConfig ? JSON.parse(layoutConfig) : null)
    }

    let data, error;
    
    // Try to update with layout_config
    const { data: tryData, error: tryError } = await admin
      .from('units')
      .update(updatePayload)
      .eq('id', unitId)
      .select()

    if (tryError) {
      if (tryError.message.includes('column') && tryError.message.includes('layout_config')) {
        // Fallback: clean payload and retry without layout_config
        const cleanPayload = { ...updatePayload }
        delete cleanPayload.layout_config
        
        const { data: retryData, error: retryError } = await admin
          .from('units')
          .update(cleanPayload)
          .eq('id', unitId)
          .select()
        data = retryData
        error = retryError
      } else {
        error = tryError
      }
    } else {
      data = tryData
    }

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin')
    return { success: true, unit: data?.[0] }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan.' }
  }
}

// ── DELETE unit ──────────────────────────────────────────────────────
export async function deleteUnitAction(unitId: number) {
  try {
    await requireAdmin()

    if (!unitId) {
      return { error: 'ID unit tidak valid.' }
    }

    const admin = createAdminClient()

    // Check if there are user_details referencing this unit
    const { count, error: countError } = await admin
      .from('user_details')
      .select('*', { count: 'exact', head: true })
      .eq('unit_id', unitId)

    if (countError) {
      return { error: countError.message }
    }

    if (count && count > 0) {
      return { error: 'Tidak bisa menghapus unit karena masih memiliki user aktif di dalamnya.' }
    }

    const { error } = await admin
      .from('units')
      .delete()
      .eq('id', unitId)

    if (error) {
      return { error: error.message }
    }

    revalidatePath('/admin')
    return { success: true }
  } catch (err: any) {
    return { error: err.message || 'Terjadi kesalahan.' }
  }
}
