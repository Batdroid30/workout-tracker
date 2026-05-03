import { Skeleton } from '@/components/ui/Skeleton'

export default function ActiveWorkoutLoading() {
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div
        className="flex items-center justify-between p-4 sticky top-0 z-10"
        style={{ borderBottom: '1px solid var(--glass-border)', background: 'rgba(6,7,13,0.85)', backdropFilter: 'blur(20px)' }}
      >
        <Skeleton className="h-6 w-32" />
        <Skeleton className="h-8 w-20 rounded-[var(--radius-pill)]" />
      </div>

      <div className="flex-1 overflow-y-auto p-4 pb-32">
        <div className="space-y-6">
          {[3, 2].map((sets, blockIdx) => (
            <div key={blockIdx} className="glass overflow-hidden">
              <div
                className="p-4 flex justify-between items-center"
                style={{ borderBottom: '1px solid var(--glass-border)' }}
              >
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-6 rounded-[var(--radius-inner)]" />
              </div>
              <div className="p-2 space-y-2">
                <div className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 px-2 py-1">
                  <Skeleton className="h-3 w-6" />
                  <Skeleton className="h-3 w-10 mx-auto" />
                  <Skeleton className="h-3 w-10 mx-auto" />
                  <Skeleton className="h-3 w-6" />
                </div>
                {[...Array(sets)].map((_, i) => (
                  <div key={i} className="grid grid-cols-[40px_1fr_1fr_40px] gap-2 items-center p-2 rounded-[var(--radius-inner)]" style={{ background: 'rgba(255,255,255,0.03)' }}>
                    <Skeleton className="h-6 w-6 rounded-[var(--radius-inner)]" />
                    <Skeleton className="h-10 w-full rounded-[var(--radius-inner)]" />
                    <Skeleton className="h-10 w-full rounded-[var(--radius-inner)]" />
                    <Skeleton className="h-8 w-8 rounded-full ml-auto" />
                  </div>
                ))}
                <div className="p-2 pt-4">
                  <Skeleton className="h-4 w-28 mx-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
        <Skeleton className="h-12 w-full rounded-[var(--radius-inner)] mt-6" />
      </div>

      <div className="fixed bottom-[72px] left-0 right-0 p-4">
        <Skeleton className="h-14 w-full rounded-[var(--radius-pill)]" />
      </div>
    </div>
  )
}
