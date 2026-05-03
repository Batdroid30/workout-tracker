export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="aurora-page flex min-h-screen flex-col items-center justify-center p-4">

      <div className="w-full max-w-sm space-y-8 relative z-10">
        <div className="text-center">
          <p
            className="text-[10px] font-medium tracking-[0.3em] uppercase mb-1"
            style={{ color: 'var(--accent)', opacity: 0.7 }}
          >
            Smart Strength Tracker
          </p>
          <h1 className="text-5xl font-black italic uppercase tracking-tighter" style={{ color: 'var(--text-hi)' }}>
            LIFTS
          </h1>
          <p className="mt-3 t-caption">Track every rep. Break every record.</p>
        </div>

        <div className="glass p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
