import { Skeleton } from '@/components/ui/Skeleton'

export default function WorkoutLoading() {
  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="flex items-center justify-between mt-4 mb-8">
        <Skeleton className="h-9 w-32" />
      </div>

      <Skeleton className="h-40 w-full rounded-[var(--radius-card)] mb-8" />

      <div className="space-y-4">
        <Skeleton className="h-5 w-24 mb-4" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
        <Skeleton className="h-24 w-full rounded-[var(--radius-card)]" />
      </div>
    </div>
  )
}
