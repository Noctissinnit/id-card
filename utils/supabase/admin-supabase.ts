import { createClient as createSupabaseClient } from '@supabase/supabase-js'

/**
 * Creates a Supabase client with the Service Role Key.
 * This bypasses Row Level Security and has full admin access.
 * Only use this in server-side code (Server Actions, API routes).
 *
 * Required env: SUPABASE_SERVICE_ROLE_KEY
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!url || !serviceRoleKey) {
    throw new Error(
      'Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Please add SUPABASE_SERVICE_ROLE_KEY to your .env.local file.'
    )
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
