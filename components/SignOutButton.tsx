'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { LogOut, Loader2 } from 'lucide-react';
import { signOutAction } from '../app/auth-actions';
import { deletePhoto } from '../app/db';

interface SignOutButtonProps {
  className?: string;
  label?: string;
  iconClassName?: string;
}

// Clears any in-progress ID card session (IndexedDB photo/barcode blobs, on top of
// the cookie signOutAction already clears) before signing out, so leftover card
// data from one person never shows up for the next person on a shared browser.
export default function SignOutButton({ className, label = 'Sign Out', iconClassName = 'w-3.5 h-3.5' }: SignOutButtonProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    setLoading(true);
    try {
      await deletePhoto('id_card_photo');
      await deletePhoto('id_card_barcode');
    } catch {
      // Best-effort — IndexedDB issues shouldn't block sign-out.
    }
    await signOutAction();
    router.push('/login');
    router.refresh();
  };

  return (
    <button type="button" onClick={handleClick} disabled={loading} className={className}>
      {loading ? <Loader2 className={`${iconClassName} animate-spin`} /> : <LogOut className={iconClassName} />}
      {label}
    </button>
  );
}
