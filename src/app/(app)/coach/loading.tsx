import { Skeleton } from '@/components/ui'

export default function CoachLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] max-w-2xl mx-auto p-4 space-y-4">
      {/* Header skeleton */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <Skeleton className="h-8 w-8 rounded-control" />
          <div className="space-y-1">
            <Skeleton className="h-4 w-20 rounded" />
            <Skeleton className="h-3 w-32 rounded" />
          </div>
        </div>
        <Skeleton className="h-7 w-20 rounded-pill" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 space-y-4 py-4">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-control shrink-0" />
          <Skeleton className="h-20 w-3/4 rounded-card" />
        </div>
        <div className="flex justify-end gap-3">
          <Skeleton className="h-12 w-1/2 rounded-card" />
          <Skeleton className="h-8 w-8 rounded-control shrink-0" />
        </div>
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-control shrink-0" />
          <Skeleton className="h-36 w-4/5 rounded-card" />
        </div>
      </div>

      {/* Input skeleton */}
      <Skeleton className="h-12 w-full rounded-card" />
    </div>
  )
}
