import { BottomNav } from '@/components/layout/BottomNav'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-[#070d1f]">
      <main className="flex-1">
        {children}
      </main>
      <BottomNav />
    </div>
  )
}
