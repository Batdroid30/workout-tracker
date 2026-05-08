import { Skeleton } from '@/components/ui/Skeleton'

export default function ProgressLoading() {
  return (
    <div className="min-h-screen p-5 pb-24">

      {/* Header: label + display title */}
      <div className="pt-4 mb-7">
        <Skeleton className="h-3 w-16 mb-1.5 rounded" />
        <Skeleton className="h-10 w-36 rounded" />
      </div>

      <div className="space-y-5">

        {/* Lifetime volume card */}
        <div className="glass p-4 flex items-center justify-between">
          <div>
            <Skeleton className="h-3 w-36 mb-2 rounded" />
            <Skeleton className="h-10 w-28 rounded" />
          </div>
          <Skeleton className="w-12 h-12 rounded-[var(--radius-inner)] shrink-0" />
        </div>

        {/* Phase coach block */}
        <Skeleton className="h-44 w-full rounded-[var(--radius-card)]" />

        {/* Volume trend */}
        <section>
          <Skeleton className="h-7 w-32 mb-3 rounded" />
          <div className="glass p-4">
            <Skeleton className="h-[200px] w-full rounded-[var(--radius-inner)]" />
          </div>
        </section>

        {/* Bodyweight */}
        <section>
          <Skeleton className="h-7 w-28 mb-3 rounded" />
          <div className="glass p-4">
            <Skeleton className="h-[160px] w-full rounded-[var(--radius-inner)]" />
          </div>
        </section>

        {/* Muscle focus radar */}
        <section>
          <div className="flex items-center justify-between mb-3">
            <Skeleton className="h-7 w-32 rounded" />
            <Skeleton className="h-6 w-20 rounded-lg" />
          </div>
          <div className="glass p-4">
            <Skeleton className="h-[240px] w-full rounded-[var(--radius-inner)]" />
          </div>
        </section>

        {/* Exercise detail teaser */}
        <section>
          <Skeleton className="h-7 w-36 mb-3 rounded" />
          <div className="glass p-4 flex items-center gap-4">
            <Skeleton className="w-11 h-11 rounded-[var(--radius-inner)] shrink-0" />
            <div className="flex-1">
              <Skeleton className="h-4 w-36 mb-1.5 rounded" />
              <Skeleton className="h-3 w-full rounded" />
            </div>
            <Skeleton className="h-9 w-20 rounded-[var(--radius-pill)] shrink-0" />
          </div>
        </section>

      </div>
    </div>
  )
}
