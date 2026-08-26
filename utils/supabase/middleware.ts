import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// Hard cap on how long a login stays valid, independent of activity — Supabase's
// own refresh-token flow would otherwise keep a session alive indefinitely.
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000 // 2 hours
const LOGIN_AT_COOKIE = 'login_at'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    return supabaseResponse
  }

  const supabase = createServerClient(
    url,
    anonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: Avoid writing any logic between createServerClient and
  // supabase.auth.getUser(). A simple mistake can make it difficult to
  // debug issues with users being logged out.
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const loginAtRaw = request.cookies.get(LOGIN_AT_COOKIE)?.value
    const loginAt = loginAtRaw ? Number(loginAtRaw) : null

    if (loginAt !== null && Number.isFinite(loginAt) && Date.now() - loginAt > SESSION_MAX_AGE_MS) {
      // Past the 2-hour cap — force sign-out and send them back to /login.
      await supabase.auth.signOut()

      const redirectResponse = NextResponse.redirect(new URL('/login', request.url))
      // Carry over the sign-out's cookie changes (queued onto supabaseResponse by
      // the client above) so the browser's auth cookies actually get cleared.
      supabaseResponse.cookies.getAll().forEach((cookie) => {
        redirectResponse.cookies.set(cookie)
      })
      redirectResponse.cookies.delete(LOGIN_AT_COOKIE)
      // Also clear any in-progress ID card session so it doesn't leak into
      // whoever logs in next on this browser.
      redirectResponse.cookies.delete('id_card_session')
      return redirectResponse
    }

    if (loginAt === null) {
      // No clock started yet (e.g. a session that predates this feature, or a
      // sign-in path that doesn't go through signInAction) — start it now.
      supabaseResponse.cookies.set(LOGIN_AT_COOKIE, String(Date.now()), {
        path: '/',
        maxAge: SESSION_MAX_AGE_MS / 1000,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
      })
    }
  }

  return supabaseResponse
}
