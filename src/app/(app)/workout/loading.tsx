import { Skeleton } from '@/components/ui/Skeleton'

export default function WorkoutLoading() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      <div className="flex items-center justify-between mt-4 mb-8">
        <Skeleton className="h-9 w-32" />
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-6 text-center mb-8">
        <Skeleton className="h-6 w-48 mx-auto mb-2" />
        <Skeleton className="h-4 w-64 mx-auto mb-6" />
        <Skeleton className="h-12 w-full rounded-xl" />
      </div>

      <div className="space-y-4">
        <Skeleton className="h-6 w-24 mb-4" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  )
}
