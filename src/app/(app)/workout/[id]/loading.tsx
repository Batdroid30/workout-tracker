import { Skeleton } from '@/components/ui/Skeleton'

export default function WorkoutHistoryDetailLoading() {
  return (
    <div className="min-h-screen pb-24">

      {/* Sticky header: back button + title + action buttons */}
      <div
        className="sticky top-0 z-30 px-4 py-3 flex items-center justify-between"
        style={{ background: 'rgba(6,7,13,0.85)', backdropFilter: 'blur(20px)', borderBottom: '1px solid var(--glass-border)' }}
      >
        <div className="flex items-center gap-3">
          <Skeleton className="w-9 h-9 rounded-[var(--radius-inner)] shrink-0" />
          <Skeleton className="h-4 w-40" />
        </div>
        <div className="flex items-center gap-2">
          <Skeleton className="w-9 h-9 rounded-[var(--radius-inner)]" />
          <Skeleton className="w-9 h-9 rounded-[var(--radius-inner)]" />
        </div>
      </div>

      <div className="p-4 space-y-5 mt-1">

        {/* Meta card: title + date */}
        <div className="glass p-4">
          <Skeleton className="h-6 w-48 mb-2 rounded" />
          <Skeleton className="h-3 w-52 rounded" />
        </div>

        {/* Stat tiles: Duration + Volume */}
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map(i => (
            <div key={i} className="glass p-4 flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-[var(--radius-inner)] shrink-0" />
              <div>
                <Skeleton className="h-3 w-16 mb-1.5 rounded" />
                <Skeleton className="h-6 w-12 rounded" />
              </div>
            </div>
          ))}
        </div>

        {/* Exercise log */}
        <div className="space-y-4">
          <Skeleton className="h-3 w-28 rounded" />

          {[3, 2].map((sets, blockIdx) => (
            <div key={blockIdx} className="glass overflow-hidden">

              {/* Exercise header: name + muscle group + delete */}
              <div
                className="px-4 py-3 flex items-center justify-between"
                style={{ background: 'var(--bg-1)', borderBottom: '1px solid var(--glass-border)' }}
              >
                <div>
                  <Skeleton className="h-4 w-40 mb-1.5 rounded" />
                  <Skeleton className="h-3 w-20 rounded" />
                </div>
                <Skeleton className="w-8 h-8 rounded-[var(--radius-inner)]" />
              </div>

              {/* Column headers: Set | kg | Reps | PR */}
              <div
                className="flex py-2 px-4"
                style={{ borderBottom: '1px solid var(--glass-border)' }}
              >
                <div className="w-10"><Skeleton className="h-2 w-6 rounded" /></div>
                <div className="flex-1 flex justify-center"><Skeleton className="h-2 w-5 rounded" /></div>
                <div className="flex-1 flex justify-center"><Skeleton className="h-2 w-8 rounded" /></div>
                <div className="w-10" />
              </div>

              {/* Set rows */}
              {[...Array(sets)].map((_, i) => (
                <div
                  key={i}
                  className="flex items-center py-3 px-4"
                  style={{ borderBottom: '1px solid var(--glass-border)' }}
                >
                  <div className="w-10"><Skeleton className="w-6 h-6 rounded-lg" /></div>
                  <div className="flex-1 flex justify-center"><Skeleton className="h-4 w-10 rounded" /></div>
                  <div className="flex-1 flex justify-center"><Skeleton className="h-4 w-8 rounded" /></div>
                  <div className="w-10" />
                </div>
              ))}

            </div>
          ))}
        </div>

      </div>
    </div>
  )
}
