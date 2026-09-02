export default function AdminLoading() {
  return (
    <div className="min-h-screen w-full flex bg-slate-50 relative">
      {/* Sidebar skeleton */}
      <aside className="hidden md:flex fixed top-0 bottom-0 left-0 z-40 w-[260px] bg-slate-900 border-r border-slate-800 flex-col">
        <div className="p-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-xl animate-pulse" />
            <div className="space-y-2">
              <div className="h-3 w-24 bg-slate-800 rounded animate-pulse" />
              <div className="h-2 w-16 bg-slate-800 rounded animate-pulse" />
            </div>
          </div>
        </div>
        <nav className="flex-1 px-4 py-6 space-y-2">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-11 w-full bg-slate-800/60 rounded-xl animate-pulse" />
          ))}
        </nav>
      </aside>

      {/* Main content skeleton */}
      <main className="flex-1 md:pl-[260px] min-h-screen relative">
        <div className="p-4 sm:p-6 md:p-8 max-w-6xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-5 w-48 bg-slate-200 rounded animate-pulse" />
              <div className="h-3 w-32 bg-slate-200 rounded animate-pulse" />
            </div>
            <div className="h-9 w-24 bg-slate-200 rounded-xl animate-pulse" />
          </div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white border border-slate-200/80 rounded-2xl p-4 space-y-3">
                <div className="h-2.5 w-16 bg-slate-200 rounded animate-pulse" />
                <div className="h-6 w-10 bg-slate-200 rounded animate-pulse" />
              </div>
            ))}
          </div>

          {/* Table skeleton */}
          <div className="bg-white border border-slate-200/80 rounded-2xl p-4 sm:p-6 space-y-4">
            <div className="h-4 w-40 bg-slate-200 rounded animate-pulse" />
            <div className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <div className="h-9 w-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 w-1/3 bg-slate-100 rounded animate-pulse" />
                    <div className="h-2.5 w-1/4 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="h-6 w-16 bg-slate-100 rounded-full animate-pulse" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
