import { Skeleton } from '@/components/ui/Skeleton'

export default function ExercisesLoading() {
  return (
    <div className="flex flex-col h-full bg-black text-white p-4">
      <div className="mb-6 pt-4">
        <Skeleton className="h-10 w-48 mb-6" />
        
        {/* Search Bar */}
        <Skeleton className="h-12 w-full rounded-xl mb-4" />
        
        {/* Filter Pills */}
        <div className="flex gap-2 overflow-hidden">
          <Skeleton className="h-8 w-20 rounded-full shrink-0" />
          <Skeleton className="h-8 w-24 rounded-full shrink-0" />
          <Skeleton className="h-8 w-28 rounded-full shrink-0" />
          <Skeleton className="h-8 w-24 rounded-full shrink-0" />
        </div>
      </div>

      <div className="flex-1 space-y-3">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} className="h-24 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  )
}
