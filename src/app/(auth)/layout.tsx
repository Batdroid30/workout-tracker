export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4 bg-[#070d1f]">
      {/* Background accent glow */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-[#CCFF00]/5 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center">
          <p className="text-[10px] font-black tracking-[0.3em] uppercase text-[#CCFF00]/60 mb-1">Smart Strength Tracker</p>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter text-white">LIFTS</h1>
          <p className="mt-3 text-[#4a5568] text-sm font-body">Track every rep. Break every record.</p>
        </div>

        <div className="glass-panel border border-[#334155] rounded-2xl p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
