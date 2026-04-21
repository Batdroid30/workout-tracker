import { Skeleton } from '@/components/ui/Skeleton'

export default function ProgressLoading() {
  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <Skeleton className="h-9 w-32 mt-4 mb-8" />

      <div className="space-y-8">
        {/* Volume Tracker */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-end mb-8">
              <div>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-10 w-32" />
              </div>
            </div>
            
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        </section>

        {/* 1RM Tracker */}
        <section>
          <div className="flex items-center justify-between mb-4">
            <Skeleton className="h-6 w-36" />
            <Skeleton className="h-8 w-36 rounded-lg" />
          </div>
          
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl p-4">
            <div className="flex justify-between items-end mb-8">
              <div>
                <Skeleton className="h-3 w-24 mb-2" />
                <Skeleton className="h-10 w-24" />
              </div>
            </div>
            
            <Skeleton className="h-[200px] w-full rounded-lg" />
          </div>
        </section>
      </div>
    </div>
  )
}
