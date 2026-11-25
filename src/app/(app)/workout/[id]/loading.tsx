import { Skeleton } from '@/components/ui/Skeleton'
import { Card } from '@/components/ui'

// Same shape as the loaded page: top bar, summary, four numbers, muscle map, exercises.
export default function WorkoutHistoryDetailLoading() {
  return (
    <div className="mx-auto min-h-screen max-w-[600px] pb-28">
      <div className="flex items-center justify-between px-2 py-1">
        <Skeleton className="size-11 rounded-pill" />
        <div className="flex items-center gap-1">
          <Skeleton className="h-9 w-32 rounded-control" />
          <Skeleton className="size-11 rounded-pill" />
        </div>
      </div>

      <div className="space-y-4 px-4">
        <div>
          <Skeleton className="h-3 w-32 rounded-control" />
          <Skeleton className="mt-2 h-8 w-48 rounded-control" />
        </div>

        <Card padding="none" className="grid grid-cols-4">
          {[0, 1, 2, 3].map(i => (
            <div key={i} className={i > 0 ? 'border-l border-border px-3 py-3' : 'px-3 py-3'}>
              <Skeleton className="h-3 w-10 rounded-control" />
              <Skeleton className="mt-1.5 h-5 w-12 rounded-control" />
            </div>
          ))}
        </Card>

        <Skeleton className="h-56 w-full rounded-card" />

        {[3, 2].map((sets, blockIdx) => (
          <Card key={blockIdx} padding="none">
            <div className="px-4 py-3">
              <Skeleton className="h-4 w-40 rounded-control" />
              <Skeleton className="mt-1.5 h-3 w-20 rounded-control" />
            </div>
            {[...Array(sets)].map((_, i) => (
              <div key={i} className="flex min-h-11 items-center gap-4 border-t border-border px-4">
                <Skeleton className="h-3 w-3 rounded-control" />
                <Skeleton className="h-4 w-20 rounded-control" />
              </div>
            ))}
          </Card>
        ))}
      </div>
    </div>
  )
}
