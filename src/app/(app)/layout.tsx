import { BottomNav } from '@/components/layout/BottomNav'
import { PullToRefresh } from '@/components/layout/PullToRefresh'
import { PageTransition } from '@/components/layout/PageTransition'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PullToRefresh>
      <main className="flex-1">
        <PageTransition>{children}</PageTransition>
      </main>
      <BottomNav />
    </PullToRefresh>
  )
}
