import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-5 pb-36">

      {/* Top bar: "Lifts" label + avatar */}
      <div className="flex items-center justify-between mb-8 pt-4">
        <Skeleton className="h-3 w-10 rounded" />
        <Skeleton className="w-10 h-10 rounded-full" />
      </div>

      {/* Hero: greeting + headline + pills + CTA card */}
      <div className="mb-7">
        <Skeleton className="h-3 w-44 mb-2 rounded" />
        <Skeleton className="h-10 w-52 mb-4 rounded" />
        <div className="flex gap-2 mb-6">
          <Skeleton className="h-6 w-20 rounded-full" />
          <Skeleton className="h-6 w-24 rounded-full" />
        </div>
        <Skeleton className="h-[88px] w-full rounded-[var(--radius-card)]" />
      </div>

      {/* Stat grid */}
      <div className="grid grid-cols-2 gap-3 mb-5">
        <Skeleton className="h-[88px] rounded-[var(--radius-card)]" />
        <Skeleton className="h-[88px] rounded-[var(--radius-card)]" />
      </div>

      {/* Bodyweight card */}
      <Skeleton className="h-16 w-full rounded-[var(--radius-card)] mb-5" />

      {/* Insights */}
      <div className="mb-5">
        <Skeleton className="h-7 w-20 mb-4 rounded" />
        <div className="space-y-3">
          {[130, 90, 110, 80].map((h, i) => (
            <Skeleton key={i} className="w-full rounded-[var(--radius-card)]" style={{ height: h }} />
          ))}
        </div>
      </div>

      {/* Recent workouts */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-7 w-20 rounded" />
          <Skeleton className="h-3 w-20 rounded" />
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-[72px] w-full rounded-[var(--radius-card)]" />
          ))}
        </div>
      </div>

    </div>
  )
}
