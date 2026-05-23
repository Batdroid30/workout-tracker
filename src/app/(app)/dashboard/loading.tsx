import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-5 pb-36 max-w-[600px] mx-auto flex flex-col gap-6">

      {/* ── TOP HEADER BAR ── */}
      <div className="flex items-center justify-between mb-1 pt-4">
        <Skeleton className="h-3 w-12 rounded" />
        <Skeleton className="w-9 h-9 rounded-full" />
      </div>

      {/* ── PREMIUM HERO CARD ── */}
      <div className="glass p-5 rounded-2xl flex flex-col gap-5 relative overflow-hidden h-[300px]">
        {/* Top greeting + Active Phase Badge */}
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <Skeleton className="h-2.5 w-24 rounded" />
            <Skeleton className="h-5 w-48 rounded" />
          </div>
          <Skeleton className="h-6 w-20 rounded-full" />
        </div>

        {/* Dual progress rings side-by-side */}
        <div className="flex items-center justify-center gap-12 py-2">
          {/* Circular skeletons for WeeklyRing and FatigueRing */}
          <Skeleton className="w-[84px] h-[84px] rounded-full" />
          <Skeleton className="w-[84px] h-[84px] rounded-full" />
        </div>

        {/* Streak & Mesocycle Phase Pills */}
        <div className="flex items-center justify-center gap-2">
          <Skeleton className="h-6 w-28 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>

        {/* Start Workout CTA */}
        <Skeleton className="h-11 w-full rounded-xl mt-1" />
      </div>

      {/* ── SUGGESTED ROUTINE ── */}
      <div className="glass p-4 h-[88px] flex flex-col justify-between">
        <div className="flex justify-between items-start">
          <div className="space-y-1.5">
            <Skeleton className="h-3 w-28 rounded" />
            <Skeleton className="h-4 w-44 rounded" />
          </div>
          <Skeleton className="h-7 w-12 rounded-md" />
        </div>
        <Skeleton className="h-2.5 w-3/4 rounded" />
      </div>

      {/* ── MISSIONS & WEEK CHECKLIST ── */}
      <div className="glass p-4 flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <Skeleton className="h-3.5 w-28 rounded" />
          <Skeleton className="h-3 w-16 rounded" />
        </div>
        <Skeleton className="h-2 w-full rounded-full" />
        <div className="space-y-2 pt-1">
          {[1, 2, 3].map(i => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-border-soft last:border-0">
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded-full" />
                <div className="space-y-1">
                  <Skeleton className="h-3 w-32 rounded" />
                  <Skeleton className="h-2.5 w-48 rounded" />
                </div>
              </div>
              <Skeleton className="w-4 h-4 rounded" />
            </div>
          ))}
        </div>
      </div>

      {/* ── COACHING SCIENCE VERTICAL STACK ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3 w-40 rounded" />
        </div>
        <div className="glass p-4 space-y-4">
          <div className="flex justify-between items-center">
            <Skeleton className="h-4 w-32 rounded" />
            <Skeleton className="h-6 w-16 rounded-full" />
          </div>
          <Skeleton className="h-24 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      </div>

      {/* ── CONSISTENCY & MOMENTUM CAROUSEL ── */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <Skeleton className="w-4 h-4 rounded" />
          <Skeleton className="h-3 w-36 rounded" />
        </div>
        <Skeleton className="h-32 w-full rounded-2xl" />
      </div>

      {/* ── SCALE CHECK ── */}
      <div className="glass p-4 h-24 flex flex-col justify-between">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-20 rounded" />
          <Skeleton className="h-2.5 w-14 rounded" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 flex-1 rounded-lg" />
          <Skeleton className="h-8 w-20 rounded-lg" />
        </div>
      </div>

      {/* ── RECENT HISTORY ── */}
      <div className="space-y-3">
        <div className="flex justify-between">
          <Skeleton className="h-3 w-24 rounded" />
          <Skeleton className="h-2.5 w-20 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[72px] w-full rounded-2xl" />
          ))}
        </div>
      </div>

    </div>
  )
}
