'use server'

import { createClient } from '@/utils/supabase/server'
import { createAdminClient } from '@/utils/supabase/admin-supabase'
import { revalidatePath } from 'next/cache'

export async function signUpAction(formData: FormData) {
  const email = formData.get('email') as string
  const password = formData.get('password') as string
  const name = formData.get('name') as string
  const unitId = formData.get('unit_id') ? Number(formData.get('unit_id')) : undefined
  const role = formData.get('role') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        name: name || '',
        unit_id: unitId,
        role: role,
      },
    },
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, user: data.user }
}

export async function signInAction(formData: FormData) {
  const usernameOrEmail = (formData.get('username') || formData.get('email')) as string
  const password = formData.get('password') as string

  if (!usernameOrEmail || !password) {
    return { error: 'Username/Email dan password wajib diisi.' }
  }

  const input = usernameOrEmail.trim()
  let resolvedEmail = input

  // If it's a username (no '@'), lookup in user_details username column
  if (!input.includes('@')) {
    try {
      const admin = createAdminClient()
      const { data, error } = await admin
        .from('user_details')
        .select('user_id')
        .eq('username', input.toLowerCase())
        .maybeSingle()

      if (data?.user_id) {
        const { data: authUser } = await admin.auth.admin.getUserById(data.user_id)
        if (authUser?.user?.email) {
          resolvedEmail = authUser.user.email
        } else {
          resolvedEmail = `${input}@idcard.local`
        }
      } else {
        // Fallback: if username lookup returns nothing, try derived email format
        resolvedEmail = `${input}@idcard.local`
      }
    } catch {
      resolvedEmail = `${input}@idcard.local`
    }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email: resolvedEmail,
    password,
  })

  if (error) {
    // If standard error is invalid login, translate to local language
    if (error.message.includes('Invalid login credentials')) {
      return { error: 'Username atau password salah.' }
    }
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true, user: data.user }
}

export async function signOutAction() {
  const supabase = await createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    return { error: error.message }
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

export async function getUserAction() {
  const supabase = await createClient()

  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { user: null }
  }

  // Get user details and join with units (including custom template fields)
  let { data: detail, error: dbError } = await supabase
    .from('user_details')
    .select('id, user_id, unit_id, role, username, units ( id, nama, card_design, card_design_back )')
    .eq('user_id', user.id)
    .single()

  if (dbError) {
    // Fallback 1: Column card_design on units table might not exist yet. Keep username select.
    const { data: fb1Data, error: fb1Error } = await supabase
      .from('user_details')
      .select('id, user_id, unit_id, role, username, units ( id, nama )')
      .eq('user_id', user.id)
      .single()

    if (!fb1Error && fb1Data) {
      const mappedUnits = Array.isArray(fb1Data.units)
        ? fb1Data.units.map(u => ({ ...u, card_design: null, card_design_back: null }))
        : fb1Data.units
          ? { ...(fb1Data.units as any), card_design: null, card_design_back: null }
          : null

      detail = {
        ...fb1Data,
        units: mappedUnits
      } as any
    } else {
      // Fallback 2: Both card_design on units and username on user_details might not exist yet.
      const { data: fb2Data } = await supabase
        .from('user_details')
        .select('id, user_id, unit_id, role, units ( id, nama )')
        .eq('user_id', user.id)
        .single()

      if (fb2Data) {
        const mappedUnits = Array.isArray(fb2Data.units)
          ? fb2Data.units.map(u => ({ ...u, card_design: null, card_design_back: null }))
          : fb2Data.units
            ? { ...(fb2Data.units as any), card_design: null, card_design_back: null }
            : null

        detail = {
          ...fb2Data,
          username: null, // fallback value
          units: mappedUnits
        } as any
      }
    }
  }

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
      detail: detail || null,
    },
  }
}
