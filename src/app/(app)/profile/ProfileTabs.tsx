'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { cn } from '@/lib/utils'

const TABS = [
  { id: 'stats',     label: 'Stats' },
  { id: 'history',   label: 'History' },
  { id: 'exercises', label: 'Exercises' },
  { id: 'account',   label: 'Account' },
]

export function ProfileTabs({ activeTab }: { activeTab: string }) {
  const router = useRouter()
  const searchParams = useSearchParams()

  function navigate(tab: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    router.push(`/profile?${params.toString()}`)
  }

  return (
    <div className="flex gap-1 bg-[#0c1324] p-1 rounded-xl border border-[#334155]">
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => navigate(tab.id)}
          className={cn(
            'flex-1 py-2 text-[10px] font-bold rounded-lg transition-all tracking-widest uppercase',
            activeTab === tab.id
              ? 'bg-[#CCFF00] text-[#020617]'
              : 'text-[#4a5568] hover:text-[#adb4ce]'
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
