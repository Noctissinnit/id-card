import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserAction } from './auth-actions';
import { Shield, CreditCard, ArrowRight, Sparkles, Database, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'YKBS ID Card Generator - Portal Resmi',
  description: 'Sistem pembuatan ID Card Karyawan Yayasan Karya Bakti Surakarta secara aman, cepat, dan profesional.',
};

export default async function Home() {
  const hasKeys = !!process.env.NEXT_PUBLIC_SUPABASE_URL && !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  let user = null;
  if (hasKeys) {
    try {
      const res = await getUserAction();
      user = res.user;
    } catch (e) {
      console.error('Failed to get user profile:', e);
    }
  }

  if (user) {
    if (user.detail?.role === 'admin') {
      redirect('/admin');
    } else {
      redirect('/form');
    }
  }

  return (
    <main className="min-h-screen w-full flex flex-col justify-between bg-white text-slate-900 relative overflow-hidden font-sans">
      {/* Decorative Top-Right Subtle Glow */}
      <div className="absolute top-0 right-0 w-[40vw] h-[40vw] bg-indigo-50/40 rounded-full filter blur-[120px] pointer-events-none" />
      <div className="absolute -top-20 -left-20 w-[30vw] h-[30vw] bg-slate-50/60 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Navigation / Header */}
      <nav className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center z-10">
        <div className="flex items-center gap-3">
          <img src="/img/images.png" alt="Logo YKBS" className="h-8 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="text-xs font-bold tracking-wider uppercase text-slate-950 leading-none">YKBS SECURE</span>
            <span className="text-[9px] font-medium tracking-[2px] uppercase text-slate-400 mt-0.5">Card Portal</span>
          </div>
        </div>
        <div className="text-[10px] font-mono text-slate-400 bg-slate-50 border border-slate-100 rounded-full px-3.5 py-1">
          v1.0.0
        </div>
      </nav>

      {/* Hero Section */}
      <div className="w-full max-w-5xl mx-auto px-6 py-12 md:py-20 flex flex-col items-center text-center z-10 flex-grow justify-center">
        {/* Subtle Badge */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-slate-50 border border-slate-200/60 rounded-full mb-6">
          <Sparkles className="w-3 h-3 text-indigo-600" />
          <span className="text-[9px] font-semibold tracking-wider uppercase text-slate-600">Enterprise ID Generator</span>
        </div>

        {/* Main Heading */}
        <h1 className="text-4xl md:text-6xl font-extrabold tracking-tight text-slate-950 max-w-3xl leading-[1.1]">
          Sistem Cetak ID Card <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
            Karyawan YKBS
          </span>
        </h1>

        {/* Description */}
        <p className="text-slate-500 text-sm md:text-base max-w-xl mt-6 leading-relaxed">
          Portal pembuatan kartu identitas resmi bagi seluruh divisi Yayasan Karya Bakti Surakarta. Cepat, terintegrasi, dan siap cetak berstandar tinggi.
        </p>

        {/* Action Button / Warning */}
        <div className="mt-10 w-full max-w-md flex flex-col items-center">
          {!hasKeys ? (
            <div className="w-full p-4 bg-slate-50 border border-slate-200/80 rounded-2xl text-left flex gap-3.5 items-start">
              <Database className="w-4.5 h-4.5 text-slate-400 shrink-0 mt-0.5" />
              <div>
                <h4 className="text-xs font-bold text-slate-900 mb-0.5">Konfigurasi Database Dibutuhkan</h4>
                <p className="text-[11px] text-slate-500 leading-normal">
                  Variabel Supabase tidak ditemukan. Silakan tambahkan file <code className="bg-slate-200/50 px-1 rounded font-mono text-[10px]">.env.local</code> di folder utama proyek Anda.
                </p>
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="w-full sm:w-auto px-7 py-3 bg-slate-950 hover:bg-slate-900 text-white font-medium rounded-xl text-xs tracking-wider uppercase transition shadow-sm hover:shadow flex items-center justify-center gap-2 group cursor-pointer"
            >
              Sign In ke Portal
              <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-1" />
            </Link>
          )}
        </div>

        {/* Minimal Features Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-4xl w-full mt-20 pt-10 border-t border-slate-100">
          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
              <CheckCircle className="w-4 h-4 text-indigo-650" />
            </div>
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Templat Resmi</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">
              Layout kartu yang otomatis terformat presisi berdasarkan divisi dan unit kerja internal.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
              <Sparkles className="w-4 h-4 text-indigo-650" />
            </div>
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Hapus Latar AI</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">
              Unggah pas foto apa saja dan biarkan AI memotong background secara transparan secara instan.
            </p>
          </div>

          <div className="flex flex-col items-center sm:items-start text-center sm:text-left">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 flex items-center justify-center mb-3">
              <Shield className="w-4 h-4 text-indigo-650" />
            </div>
            <h4 className="text-xs font-bold text-slate-950 uppercase tracking-wider">Keamanan Data</h4>
            <p className="text-[11px] text-slate-500 leading-relaxed mt-1.5">
              Setiap ID Card diverifikasi langsung melalui akun resmi unit kerja bersangkutan.
            </p>
          </div>
        </div>
      </div>

      {/* Minimal Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-4 z-10">
        <div className="text-[10px] text-slate-400 font-mono text-center sm:text-left">
          &copy; {new Date().getFullYear()} Yayasan Karya Bakti Surakarta. Hak Cipta Dilindungi.
        </div>
        <div className="text-[9px] font-mono text-slate-500 bg-slate-50 border border-slate-150 px-3 py-1 rounded-full uppercase tracking-wider">
          Internal Network Only
        </div>
      </footer>
    </main>
  );
}
