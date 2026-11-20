import { Card } from '@/components/ui'
import { Skeleton } from '@/components/ui/Skeleton'

// Mirrors the Home layout: header, Today, This week, Latest.
export default function DashboardLoading() {
  return (
    <div className="min-h-screen px-5 pb-28 max-w-[600px] mx-auto space-y-5" aria-busy="true">
      <div className="flex items-center justify-between pt-4">
        <div className="space-y-2">
          <Skeleton className="h-3 w-28" />
          <Skeleton className="h-7 w-52" />
        </div>
        <Skeleton className="w-11 h-11 rounded-pill" />
      </div>
      <Card>
        <Skeleton className="h-6 w-28 rounded-pill" />
        <Skeleton className="mt-4 h-7 w-3/4" />
        <Skeleton className="mt-2 h-4 w-1/2" />
        <Skeleton className="mt-5 h-12 w-full rounded-pill" />
      </Card>
      <Card>
        <Skeleton className="h-5 w-24" />
        <div className="mt-4 grid grid-cols-3 gap-3">
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
          <Skeleton className="h-12" />
        </div>
      </Card>
      <Card>
        <Skeleton className="h-5 w-40" />
        <Skeleton className="mt-2 h-4 w-2/3" />
      </Card>
    </div>
  )
}
