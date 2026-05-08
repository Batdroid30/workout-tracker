import { Skeleton } from '@/components/ui/Skeleton'

export default function ExerciseDetailLoading() {
  return (
    <div className="min-h-screen pb-24">

      {/* Sticky header */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center gap-3"
        style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(6,7,13,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <Skeleton className="w-8 h-8 rounded-[var(--radius-inner)] shrink-0" />
        <div className="flex-1 min-w-0">
          <Skeleton className="h-4 w-40 mb-1.5 rounded" />
          <Skeleton className="h-3 w-28 rounded" />
        </div>
      </div>

      <div className="p-4 space-y-6 mt-2">

        {/* PR grid */}
        <section>
          <Skeleton className="h-3 w-32 mb-3 rounded" />
          <div className="grid grid-cols-2 gap-3">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="glass p-4 text-center rounded-[var(--radius-card)]">
                <Skeleton className="w-4 h-4 rounded mx-auto mb-2" />
                <Skeleton className="h-3 w-20 mx-auto mb-2 rounded" />
                <Skeleton className="h-7 w-16 mx-auto rounded" />
              </div>
            ))}
          </div>
        </section>

        {/* Chart placeholders */}
        {[1, 2].map(i => (
          <section key={i}>
            <Skeleton className="h-3 w-40 mb-3 rounded" />
            <div className="glass p-4 rounded-[var(--radius-card)]">
              <Skeleton className="h-[180px] w-full rounded-[var(--radius-inner)]" />
            </div>
          </section>
        ))}

        {/* Coach insights */}
        <section>
          <Skeleton className="h-3 w-28 mb-3 rounded" />
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="glass p-4 flex items-start gap-3 rounded-[var(--radius-card)]">
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
