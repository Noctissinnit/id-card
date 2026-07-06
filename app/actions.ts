'use server';

import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface IDCardSession {
  sessionId: string;
  nama: string;
  nik: string;
  jabatan: string;
  departemen: string;
  theme: string;
  photoUrl: string;
}

export async function getSession(): Promise<IDCardSession | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get('id_card_session');
  if (!sessionCookie || !sessionCookie.value) {
    return null;
  }
  try {
    return JSON.parse(sessionCookie.value) as IDCardSession;
  } catch (error) {
    console.error('Failed to parse session cookie:', error);
    return null;
  }
}

export async function saveSessionAction(formData: FormData) {
  const nama = formData.get('nama') as string;
  const nik = formData.get('nik') as string;
  const jabatan = formData.get('jabatan') as string;
  const departemen = formData.get('departemen') as string;
  const theme = formData.get('theme') as string;
  const hasPhoto = formData.get('hasPhoto') as string; // 'true' or 'false'

  // Retrieve or create sessionId
  const existingSession = await getSession();
  const sessionId = existingSession?.sessionId || crypto.randomUUID();
  let photoUrl = existingSession?.photoUrl || '';

  if (hasPhoto === 'true') {
    photoUrl = 'indexeddb';
  } else if (hasPhoto === 'false') {
    photoUrl = '';
  }

  // Create session object
  const sessionData: IDCardSession = {
    sessionId,
    nama: nama || '',
    nik: nik || '',
    jabatan: jabatan || '',
    departemen: departemen || '',
    theme: theme || 'modern-blue',
    photoUrl,
  };

  const cookieStore = await cookies();
  cookieStore.set('id_card_session', JSON.stringify(sessionData), {
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  return { success: true, data: sessionData };
}

export async function clearSessionAction() {
  const cookieStore = await cookies();
  cookieStore.delete('id_card_session');
  return { success: true };
}
