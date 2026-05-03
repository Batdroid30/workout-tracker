import { Skeleton } from '@/components/ui/Skeleton'

export default function DashboardLoading() {
  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between mb-8 pt-4">
        <div>
          <Skeleton className="h-9 w-24 mb-2" />
          <Skeleton className="h-4 w-20" />
        </div>
        <Skeleton className="w-10 h-10 rounded-[var(--radius-inner)]" />
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
        <Skeleton className="h-28 rounded-[var(--radius-card)]" />
      </div>

      <div>
        <Skeleton className="h-5 w-36 mb-4" />
        <div className="space-y-4">
          <Skeleton className="h-32 rounded-[var(--radius-card)]" />
          <Skeleton className="h-32 rounded-[var(--radius-card)]" />
          <Skeleton className="h-32 rounded-[var(--radius-card)]" />
        </div>
      </div>

      <div className="fixed bottom-24 left-1/2 -translate-x-1/2 z-30">
        <Skeleton className="h-16 w-48 rounded-[var(--radius-pill)]" />
      </div>
    </div>
  )
}
