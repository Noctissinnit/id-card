'use client';

import { useEffect } from 'react';

// Mirrors SESSION_MAX_AGE_MS in utils/supabase/middleware.ts — the hard 2-hour
// absolute login cap. Middleware only enforces this on the *next* request, so a
// tab left open past the 2-hour mark would otherwise sit on stale/expired auth
// until the user happens to navigate or submit something. This schedules a full
// page reload right at expiry so that next request (and middleware's redirect
// to /login) happens automatically instead.
const SESSION_MAX_AGE_MS = 2 * 60 * 60 * 1000;

interface SessionExpiryWatcherProps {
  loginAt: number | null;
}

export default function SessionExpiryWatcher({ loginAt }: SessionExpiryWatcherProps) {
  useEffect(() => {
    if (loginAt === null) return;

    const remainingMs = SESSION_MAX_AGE_MS - (Date.now() - loginAt);
    if (remainingMs <= 0) {
      window.location.reload();
      return;
    }

    const timer = setTimeout(() => {
      window.location.reload();
    }, remainingMs);

    return () => clearTimeout(timer);
  }, [loginAt]);

  return null;
}
