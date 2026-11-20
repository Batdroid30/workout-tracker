import { Skeleton } from '@/components/ui'

export default function AccountLoading() {
  return (
    <div className="min-h-screen px-5 pt-4 pb-28">
      <Skeleton className="h-11 w-11 rounded-pill mb-2" />
      <div className="flex items-center gap-4 mb-6">
        <Skeleton className="w-14 h-14 rounded-control" />
        <div className="space-y-2">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-3 w-48" />
        </div>
      </div>
      <div className="space-y-5">
        {[1, 2, 3, 4].map(i => (
          <div key={i}>
            <Skeleton className="h-3 w-20 mb-1.5" />
            <Skeleton className="h-11 w-full rounded-control" />
          </div>
        ))}
        <Skeleton className="h-12 w-full rounded-pill mt-4" />
      </div>
    </div>
  )
}
