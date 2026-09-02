export default function AdminLoading() {
  return (
    <main className="min-h-screen w-full flex flex-col items-center justify-center gap-6 bg-white">
      <img
        src="/img/final%20logo%20clor.png"
        alt="Logo Yayasan Karya Bakti Surakarta"
        className="h-12 w-auto object-contain"
      />

      <div className="relative h-10 w-10 flex items-center justify-center">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-500 opacity-20" />
        <div className="animate-spin rounded-full h-9 w-9 border-2 border-transparent border-t-indigo-600 border-r-indigo-600" />
      </div>

      <div className="text-center space-y-1">
        <p className="text-xs font-bold tracking-wider uppercase text-slate-700">Memuat Dashboard Admin</p>
        <p className="text-[10px] text-slate-400 font-mono">Mohon tunggu sebentar...</p>
      </div>
    </main>
  );
}
