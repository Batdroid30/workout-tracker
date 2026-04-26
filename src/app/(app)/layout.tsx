import { BottomNav } from '@/components/layout/BottomNav'
import { PullToRefresh } from '@/components/layout/PullToRefresh'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <PullToRefresh>
      <main className="flex-1">
        {children}
      </main>
      <BottomNav />
    </PullToRefresh>
  )
}
