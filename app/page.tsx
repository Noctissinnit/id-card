import React from 'react';
import { getSession } from './actions';
import IDCardForm from './id-card-form';
import IDCardPreview from './id-card-preview';
import { ShieldAlert, CreditCard } from 'lucide-react';

export const metadata = {
  title: 'YKBS Labs ID Card Generator - Session Persisted',
  description: 'Generate and print high-quality professional ID cards securely. Your details are saved in the session.',
};

export default async function Home() {
  const session = await getSession();

  return (
    <main className="min-h-screen w-full flex flex-col justify-between bg-slate-50 text-slate-900 relative bg-grid-pattern py-12 px-4 md:px-8">
      
      {/* Background radial glows (Soft Light Mode Pastels) */}
      <div className="absolute top-[-10%] left-[-10%] w-[50vw] h-[50vw] bg-indigo-200/20 rounded-full filter blur-[100px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50vw] h-[50vw] bg-purple-200/20 rounded-full filter blur-[100px] pointer-events-none" />

      {/* Main Header / Branding */}
      <div className="w-full max-w-5xl mx-auto flex flex-col items-center justify-center mb-8 z-10 text-center">
        <div className="flex items-center gap-2 px-3.5 py-1 bg-white border border-slate-200/80 rounded-full mb-4 shadow-sm">
          <CreditCard className="w-3.5 h-3.5 text-indigo-500" />
          <span className="text-[10px] font-mono tracking-[3px] uppercase text-slate-600 font-semibold">Secure Issuing System</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-600 bg-clip-text text-transparent">
          YKBS SECURE CARD
        </h1>
        <p className="text-xs md:text-sm text-slate-500 font-mono mt-2 uppercase tracking-[2px] font-semibold">
          PT YKBS Labs Indonesia &bull; Card Generation Portal
        </p>
      </div>

      {/* Body Content Area */}
      <div className="w-full flex-grow flex items-center justify-center z-10">
        {!session ? (
          <IDCardForm />
        ) : (
          <IDCardPreview data={session} />
        )}
      </div>

      {/* Footer Branding & Disclaimer */}
      <div className="w-full max-w-5xl mx-auto mt-12 z-10 border-t border-slate-200 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="text-[10px] text-slate-500 font-mono max-w-md leading-relaxed">
          Sistem Generator ID Card ini berjalan secara penuh di sisi client dan server-memory. Data di dalam cookie session terenkripsi ringan secara lokal.
        </div>
        <div className="flex items-center gap-2 text-[10px] text-slate-600 font-mono bg-white px-3 py-1.5 border border-slate-200 rounded-lg shadow-sm">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
          <span>Internal Use Only &bull; ISSUER: YKBS SECURITY DEPT</span>
        </div>
      </div>

    </main>
  );
}
