export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center">
          <h1 className="text-4xl font-bold font-mono tracking-tighter text-brand">LIFTS</h1>
          <p className="mt-2 text-zinc-400">Track your workouts like a pro.</p>
        </div>
        {children}
      </div>
    </div>
  )
}
