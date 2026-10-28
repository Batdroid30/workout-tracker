export default function CoachLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto p-4 space-y-4 animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-xl bg-zinc-800" />
          <div className="space-y-1">
            <div className="h-4 w-20 rounded bg-zinc-800" />
            <div className="h-3 w-32 rounded bg-zinc-900" />
          </div>
        </div>
        <div className="h-7 w-20 rounded-xl bg-zinc-800" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 py-4">
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-xl bg-zinc-800 shrink-0" />
          <div className="h-20 w-3/4 rounded-2xl bg-zinc-900" />
        </div>
        <div className="flex justify-end gap-3">
          <div className="h-12 w-1/2 rounded-2xl bg-teal-900/30" />
          <div className="h-8 w-8 rounded-xl bg-zinc-800 shrink-0" />
        </div>
        <div className="flex gap-3">
          <div className="h-8 w-8 rounded-xl bg-zinc-800 shrink-0" />
          <div className="h-36 w-4/5 rounded-2xl bg-zinc-900" />
        </div>
      </div>

      {/* Input skeleton */}
      <div className="h-12 w-full rounded-2xl bg-zinc-900" />
    </div>
  )
}
