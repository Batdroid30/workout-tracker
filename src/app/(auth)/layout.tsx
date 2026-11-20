export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-bg">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <p className="t-label text-tertiary mb-1">Smart strength tracker</p>
          <h1 className="text-5xl font-bold tracking-tight text-primary">Lifts</h1>
          <p className="mt-3 t-caption">Track every rep. Break every record.</p>
        </div>

        <div className="card p-6">
          {children}
        </div>
      </div>
    </div>
  )
}
