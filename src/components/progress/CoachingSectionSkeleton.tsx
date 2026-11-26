import { Skeleton } from '@/components/ui/Skeleton'

// Keeps the #coaching anchor and heading in place while the section streams
// in, so Home's "/progress#coaching" links still land on it.
export function CoachingSectionSkeleton() {
  return (
    <section id="coaching" className="scroll-mt-5 space-y-3" aria-busy="true">
      <h2 className="t-display-s">Coaching</h2>
      <Skeleton className="h-40 w-full rounded-card" />
      <Skeleton className="h-28 w-full rounded-card" />
      <Skeleton className="h-20 w-full rounded-card" />
    </section>
  )
}
