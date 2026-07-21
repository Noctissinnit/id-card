import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getUserAction } from './auth-actions';
import { ArrowRight, Database, Cpu, Users } from 'lucide-react';

export const metadata = {
  title: 'Unified Identity Portal',
  description: 'Portal Cetak & Manajemen ID Card Karyawan untuk seluruh unit usaha di bawah jaringan Yayasan Karya Bakti Surakarta & PT ATMI.',
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
    <main className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 relative overflow-hidden font-sans">
      {/* Premium background glows & grids */}
      <div className="absolute inset-0 bg-grid-pattern opacity-60 pointer-events-none z-0" />
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full filter blur-[120px] pointer-events-none z-0" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/15 rounded-full filter blur-[120px] pointer-events-none z-0" />

      {/* Header */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex justify-between items-center z-10 relative">
        <div className="flex items-center gap-3">
          <img src="/img/images.png" alt="Logo ATMI" className="h-10 w-auto object-contain" />
          <div className="flex flex-col">
            <span className="text-xs font-black tracking-wider uppercase text-slate-900 leading-none">ATMI SOLO</span>
            <span className="text-[8px] font-bold tracking-[2px] uppercase text-indigo-600 mt-0.5">Identity Portal</span>
          </div>
        </div>
      </header>

      {/* Hero & Split View */}
      <section className="w-full max-w-6xl mx-auto px-6 py-8 md:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-center z-10 flex-grow justify-center relative">
        {/* Left Column: Simplistic copy */}
        <div className="lg:col-span-7 flex flex-col items-start text-left space-y-5 max-w-lg">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-black tracking-tight text-slate-950 leading-none">
            Sistem ID Card <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-indigo-800">
              Grup Terpadu
            </span>
          </h1>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed">
            Portal cetak kartu identitas resmi untuk seluruh unit kerja Yayasan Karya Bakti Surakarta & PT ATMI.
          </p>

          {/* Access Area */}
          <div className="w-full pt-2 flex flex-col gap-3 items-start">
            {!hasKeys ? (
              <>
                <button
                  disabled
                  className="inline-flex px-6 py-3 bg-slate-200 text-slate-400 border border-slate-350 font-bold rounded-xl text-[11px] tracking-wider uppercase cursor-not-allowed items-center justify-center gap-2"
                >
                  Masuk ke Portal
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
                <div className="w-full max-w-md p-3.5 bg-amber-50 border border-amber-200 rounded-xl text-left flex gap-2.5 items-start">
                  <Database className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-[10px] font-bold text-amber-800 mb-0.5">Konfigurasi Database Dibutuhkan</h4>
                    <p className="text-[9px] text-amber-700 leading-normal">
                      Variabel Supabase tidak ditemukan. Silakan tambahkan file <code className="bg-amber-100/50 px-1 rounded font-mono text-[9px]">.env.local</code>.
                    </p>
                  </div>
                </div>
              </>
            ) : (
              <Link
                href="/login"
                className="inline-flex px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[11px] tracking-wider uppercase transition shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 group cursor-pointer"
              >
                Masuk ke Portal
                <ArrowRight className="w-3.5 h-3.5 transition group-hover:translate-x-0.5" />
              </Link>
            )}
          </div>
        </div>

        {/* Right Column: Sleek Floating Card */}
        <div className="lg:col-span-5 flex justify-center lg:justify-end w-full relative">
          <div className="relative w-[260px] h-[400px] rounded-2xl bg-white border border-slate-200 p-4 shadow-xl shadow-slate-200/40 transition duration-500 hover:border-indigo-500/30 hover:-translate-y-1">
            <div className="w-full h-full rounded-xl bg-gradient-to-b from-indigo-50/20 via-white to-slate-50/50 border border-indigo-500/5 overflow-hidden relative flex flex-col justify-between p-3.5">
              
              {/* Card Header */}
              <div className="flex justify-between items-start z-10">
                <div className="flex items-center gap-1">
                  <div className="w-4 h-4 rounded bg-indigo-600 flex items-center justify-center text-[8px] font-bold text-white">Y</div>
                  <span className="text-[8px] font-bold tracking-wider text-slate-700">HOLDING ID</span>
                </div>
              </div>

              {/* Card Content */}
              <div className="flex flex-col items-center justify-center flex-grow space-y-3 z-10">
                <div className="w-22 aspect-[3/4] bg-slate-50 border border-slate-200 rounded-lg overflow-hidden relative flex items-center justify-center shadow-inner">
                  <Users className="w-6 h-6 text-indigo-600/30" />
                </div>
                <div className="text-center space-y-0.5">
                  <span className="text-[8px] font-bold text-indigo-600 tracking-[1.5px] uppercase">JABATAN</span>
                  <h3 className="text-xs font-black text-slate-900 uppercase tracking-wide">NAMA KARYAWAN</h3>
                  <span className="text-[8px] font-mono text-slate-500">123/45/67</span>
                </div>
              </div>

              {/* Card Footer */}
              <div className="border-t border-slate-200 pt-2 flex flex-col items-center gap-1 z-10">
                <div className="w-full h-3.5 opacity-20 bg-[repeating-linear-gradient(90deg,#475569,#475569_1.5px,transparent_1.5px,transparent_4.5px)]" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="w-full max-w-6xl mx-auto px-6 py-5 border-t border-slate-200 flex items-center justify-between z-10 relative">
        <div className="text-[9px] text-slate-400 font-mono">
          &copy; {new Date().getFullYear()} Unified Identity Platform.
        </div>
        <div className="text-[8px] font-mono text-indigo-750 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-full uppercase tracking-wider">
          Secured
        </div>
      </footer>
    </main>
  );
}


