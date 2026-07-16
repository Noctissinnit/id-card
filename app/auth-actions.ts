'use server'

import { createClient } from '@/utils/supabase/server'
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
  const email = formData.get('email') as string
  const password = formData.get('password') as string

  if (!email || !password) {
    return { error: 'Email and password are required' }
  }

  const supabase = await createClient()

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
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

  // Get user details and join with units
  const { data: detail, error: dbError } = await supabase
    .from('user_details')
    .select('id, user_id, unit_id, role, units ( id, nama )')
    .eq('user_id', user.id)
    .single()

  return {
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || '',
      detail: detail || null,
    },
  }
}
