import { Skeleton } from '@/components/ui/Skeleton'

export default function ProgressLoading() {
  return (
    <div className="min-h-screen p-4 pb-24">
      <Skeleton className="h-9 w-32 mt-4 mb-8" />

      <div className="space-y-8">
        {[1, 2].map((i) => (
          <section key={i}>
            <div className="flex items-center justify-between mb-4">
              <Skeleton className="h-5 w-36" />
              <Skeleton className="h-8 w-28 rounded-[var(--radius-pill)]" />
            </div>
            <div className="glass p-4">
              <div className="flex justify-between items-end mb-8">
                <div>
                  <Skeleton className="h-3 w-24 mb-2" />
                  <Skeleton className="h-10 w-32" />
                </div>
              </div>
              <Skeleton className="h-[200px] w-full rounded-[var(--radius-inner)]" />
            </div>
          </section>
        ))}
      </div>
    </div>
  )
}
