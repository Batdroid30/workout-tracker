import { Skeleton } from '@/components/ui/Skeleton'

export default function ProfileLoading() {
  return (
    <div className="min-h-screen p-4 pb-24">
      <div className="pt-8 mb-8">
        <Skeleton className="h-10 w-32 mb-2" />
        <Skeleton className="h-4 w-40" />
      </div>

      <div className="max-w-md mx-auto space-y-8">
        <div className="flex flex-col items-center">
          <Skeleton className="w-20 h-20 rounded-[var(--radius-inner)] mb-4" />
          <Skeleton className="h-4 w-32 mb-2" />
          <Skeleton className="h-4 w-24" />
        </div>

        <Skeleton className="h-11 w-full rounded-[var(--radius-inner)]" />

        <div className="glass p-4 space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i}>
              <Skeleton className="h-3 w-16 mb-2" />
              <Skeleton className="h-11 w-full rounded-[var(--radius-inner)]" />
            </div>
          ))}
          <Skeleton className="h-12 w-full rounded-[var(--radius-pill)] mt-2" />
        </div>
      </div>
    </div>
  )
}
