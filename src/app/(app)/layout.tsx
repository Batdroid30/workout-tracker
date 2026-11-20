import { BottomNav } from '@/components/layout/BottomNav'
import { WorkoutBar } from '@/components/layout/WorkoutBar'
import { PullToRefresh } from '@/components/layout/PullToRefresh'
import { PageTransition } from '@/components/layout/PageTransition'
import { requireAuth } from '@/lib/auth'
import { redirect } from 'next/navigation'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { session } = await requireAuth()
  if (!session?.user?.id) {
    redirect('/login')
  }

  return (
    <PullToRefresh>
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <WorkoutBar />
      <BottomNav />
    </PullToRefresh>
  )
}
