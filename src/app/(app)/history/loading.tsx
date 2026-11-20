import { Skeleton } from '@/components/ui'

export default function HistoryLoading() {
  return (
    <div className="min-h-screen px-5 pt-4 pb-28">
      <Skeleton className="h-11 w-11 rounded-pill mb-2" />
      <Skeleton className="h-7 w-32 mb-5" />
      <div className="space-y-3">
        {[1, 2, 3].map(i => (
          <div key={i} className="card p-4">
            <div className="flex justify-between mb-3">
              <div>
                <Skeleton className="h-4 w-32 mb-2" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-6 w-14 rounded-control" />
            </div>
            <Skeleton className="h-5 w-16 rounded-pill mb-3" />
            <Skeleton className="h-3 w-48" />
          </div>
        ))}
      </div>
    </div>
  )
}
