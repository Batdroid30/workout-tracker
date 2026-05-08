import { Skeleton } from '@/components/ui/Skeleton'

export default function RoutinesLoading() {
  return (
    <div className="min-h-screen p-5 pb-36">

      {/* Header */}
      <div className="pt-4 mb-7">
        <Skeleton className="h-3 w-14 mb-2 rounded" />
        <Skeleton className="h-10 w-28 rounded" />
      </div>

      {/* Start session CTA */}
      <Skeleton className="h-20 w-full rounded-[var(--radius-card)] mb-7" />

      {/* Routines section */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="h-6 w-24 rounded" />
          <Skeleton className="h-8 w-20 rounded-full" />
        </div>

        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="glass p-4 rounded-[var(--radius-card)]">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <Skeleton className="h-5 w-36 mb-1.5 rounded" />
                  <Skeleton className="h-3 w-24 rounded" />
                </div>
                <Skeleton className="h-8 w-20 rounded-[var(--radius-pill)]" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-5 w-16 rounded-full" />
                <Skeleton className="h-5 w-20 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
