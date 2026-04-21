import { Skeleton } from '@/components/ui/Skeleton'

export default function ActiveWorkoutLoading() {
  return (
    <div className="flex flex-col h-full bg-black text-white">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-zinc-800 bg-black sticky top-0 z-10">
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20 rounded-lg" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="space-y-6">
          {/* Exercise block 1 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            
            <div className="p-2 space-y-2">
              <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 px-2 py-1">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-10 mx-auto" />
                <Skeleton className="h-3 w-10 mx-auto" />
                <Skeleton className="h-3 w-6" />
              </div>
              
              {[...Array(3)].map((_, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center p-2 rounded-lg bg-zinc-800/30">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                </div>
              ))}
              
              <div className="p-2 pt-4">
                <Skeleton className="h-4 w-28 mx-auto" />
              </div>
            </div>
          </div>

          {/* Exercise block 2 */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800/50 flex justify-between items-center">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-6 rounded-md" />
            </div>
            
            <div className="p-2 space-y-2">
              <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 px-2 py-1">
                <Skeleton className="h-3 w-6" />
                <Skeleton className="h-3 w-10 mx-auto" />
                <Skeleton className="h-3 w-10 mx-auto" />
                <Skeleton className="h-3 w-6" />
              </div>
              
              {[...Array(2)].map((_, i) => (
                <div key={i} className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center p-2 rounded-lg bg-zinc-800/30">
                  <Skeleton className="h-6 w-6 rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-10 w-full rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                </div>
              ))}
            </div>
          </div>
        </div>

        <Skeleton className="h-12 w-full rounded-xl mt-6" />
      </div>

      <div className="fixed bottom-[72px] left-0 right-0 p-4 bg-gradient-to-t from-black via-black to-transparent">
        <Skeleton className="h-14 w-full rounded-xl" />
      </div>
    </div>
  )
}
