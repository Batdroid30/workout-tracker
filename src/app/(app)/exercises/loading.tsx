import { Skeleton } from '@/components/ui/Skeleton'

export default function ExercisesLoading() {
  // 7 pills: All, Chest, Back, Legs, Shoulders, Arms, Core
  const pillWidths = [44, 60, 52, 52, 88, 56, 52]

  return (
    <div className="flex flex-col h-full">

      {/* Sticky header — matches ExerciseListClient sticky block */}
      <div className="sticky top-0 z-10 pb-4 pt-4 px-4 space-y-3 bg-bg border-b border-border">
        <div>
          <Skeleton className="h-3 w-14 mb-1.5 rounded" />
          <Skeleton className="h-8 w-28 rounded" />
        </div>

        {/* Search bar */}
        <Skeleton className="h-11 w-full rounded-control" />

        {/* Muscle group pills */}
        <div className="flex gap-2 overflow-hidden -mx-4 px-4">
          {pillWidths.map((w, i) => (
            <Skeleton
              key={i}
              className="h-10 rounded-pill shrink-0"
              style={{ width: w }}
            />
          ))}
        </div>
      </div>

      {/* Exercise list rows */}
      <div className="flex-1 p-4 space-y-2">
        {[...Array(9)].map((_, i) => (
          <Skeleton key={i} className="h-[62px] w-full rounded-control" />
        ))}
      </div>

    </div>
  )
}
