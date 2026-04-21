import { Skeleton } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="pt-8 mb-12">
        <Skeleton className="h-10 w-32 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="max-w-md mx-auto">
        <div className="space-y-8">
          <div className="flex flex-col items-center">
            <Skeleton className="w-24 h-24 rounded-full mb-4" />
            <Skeleton className="h-4 w-32 mb-2" />
            <Skeleton className="h-4 w-24" />
          </div>

          <div className="space-y-4">
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-4 w-16 mb-2" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            <div>
              <Skeleton className="h-4 w-24 mb-2" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
            
            <Skeleton className="h-12 w-full rounded-xl mt-6" />
          </div>
        </div>
      </div>
    </div>
  )
}
