'use client';

import { useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { clearSessionAction } from '../app/actions';

// Cookie mutations are only allowed inside a Server Action invoked from the client
// (form submit, or a client component calling it directly) — never during a Server
// Component's own render. This lets a server page request a session clear (e.g. the
// in-progress card belongs to a different unit) without violating that rule.
export default function ClearSessionOnMount() {
  const router = useRouter();
  const hasRun = useRef(false);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;
    clearSessionAction().then(() => router.refresh());
  }, [router]);

  return null;
}
