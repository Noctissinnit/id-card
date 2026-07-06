'use server';

import { cookies } from 'next/headers';
import fs from 'fs';
import path from 'path';
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
  const photo = formData.get('photo') as File | null;

  // Retrieve or create sessionId
  const existingSession = await getSession();
  const sessionId = existingSession?.sessionId || crypto.randomUUID();
  let photoUrl = existingSession?.photoUrl || '';

  // Handle file upload
  if (photo && photo.size > 0) {
    const arrayBuffer = await photo.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine extension or fallback to png
    const ext = path.extname(photo.name) || '.png';
    const filename = `${sessionId}${ext}`;
    const uploadDir = path.join(process.cwd(), 'public', 'uploads');
    
    // Ensure upload directory exists
    await fs.promises.mkdir(uploadDir, { recursive: true });

    // Write file to public/uploads/
    const filePath = path.join(uploadDir, filename);
    await fs.promises.writeFile(filePath, buffer);
    photoUrl = `/uploads/${filename}`;
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
  const existingSession = await getSession();
  if (existingSession && existingSession.photoUrl) {
    // Optionally delete the photo from filesystem
    const relativePath = existingSession.photoUrl.replace(/^\//, ''); // remove leading slash
    const filePath = path.join(process.cwd(), 'public', relativePath);
    try {
      if (fs.existsSync(filePath)) {
        await fs.promises.unlink(filePath);
      }
    } catch (error) {
      console.error('Failed to delete session photo:', error);
    }
  }

  const cookieStore = await cookies();
  cookieStore.delete('id_card_session');

  return { success: true };
}
