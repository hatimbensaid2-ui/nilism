export default function Header() {
  return (
    <header className="text-center pt-10 pb-6 px-4">
      <div className="inline-flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-white" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1M4.22 4.22l.7.7m13.16 13.16.7.7M3 12H4m16 0h1M4.22 19.78l.7-.7M18.36 5.64l.7-.7" />
            <circle cx="12" cy="12" r="4" />
          </svg>
        </div>
        <span className="text-lg font-bold text-cyan-400 tracking-wide text-glow-cyan">Decision Compass</span>
      </div>
      <h1 className="text-3xl sm:text-4xl font-extrabold text-white mb-2 tracking-tight">
        Nihilism Pragmatic
      </h1>
      <p className="text-slate-400 text-sm sm:text-base max-w-lg mx-auto">
        Evaluate every decision by weighing its{' '}
        <span className="text-emerald-400 font-medium">benefits</span> against its{' '}
        <span className="text-red-400 font-medium">harms</span> — on yourself and on others.
      </p>
    </header>
  )
}
