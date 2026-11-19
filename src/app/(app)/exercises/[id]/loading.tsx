import { Skeleton } from '@/components/ui/Skeleton'

export default function ExerciseDetailLoading() {
  return (
    <div className="min-h-screen pb-24">

      {/* Sticky header */}
      <div className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3 bg-bg border-b border-border">
        <Skeleton className="w-8 h-8 rounded-control shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-40 mb-1.5 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">

        {/* Tutorial video collapsible row */}
        <section>
          <div className="flex items-center justify-between py-1">
            <div className="flex items-center gap-2">
              <Skeleton className="w-4 h-4 rounded" />
              <Skeleton className="h-3 w-32 rounded" />
            </div>
            <Skeleton className="w-4 h-4 rounded" />
          </div>
        </section>

        {/* PR grid */}
        <section>
          <Skeleton className="h-3 w-32 mb-3 rounded" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="card p-4 text-center">
                <Skeleton className="w-4 h-4 rounded mx-auto mb-2" />
                <Skeleton className="h-3 w-20 mx-auto mb-2 rounded" />
                <Skeleton className="h-7 w-16 mx-auto rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* Chart placeholders — real page shows up to 3 */}
        {[1, 2, 3].map(i => (
          <section key={i}>
            <Skeleton className="h-3 w-40 mb-3 rounded" />
            <div className="card p-4">
              <Skeleton className="h-[180px] w-full rounded-control" />
            </div>
          </section>
        ))}

        {/* Coach insights */}
        <section>
          <Skeleton className="h-3 w-28 mb-3 rounded" />
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="card p-4 flex items-start gap-3">
                <Skeleton className="w-4 h-4 rounded shrink-0 mt-0.5" />
                <div className="flex-1">
                  <Skeleton className="h-3 w-full mb-1.5 rounded" />
                  <Skeleton className="h-3 w-4/5 rounded" />
                </div>
              </div>
            ))}
          </div>
        </section>

      </div>
    </div>
  )
}
