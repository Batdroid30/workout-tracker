import { Skeleton } from '@/components/ui/Skeleton'

export default function ExercisesLoading() {
  return (
    <div className="flex flex-col h-full p-4">
      <div className="mb-6 pt-4">
        <Skeleton className="h-10 w-48 mb-6" />
        <Skeleton className="h-11 w-full rounded-[var(--radius-inner)] mb-4" />
        <div className="flex gap-2 overflow-hidden">
          {[80, 96, 112, 96].map((w, i) => (
            <Skeleton key={i} className={`h-8 w-${w} rounded-[var(--radius-pill)] shrink-0`} />
          ))}
        </div>
      </div>

      <div className="flex-1 space-y-2">
        {[...Array(7)].map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-[var(--radius-inner)]" />
        ))}
      </div>
    </div>
  )
}
