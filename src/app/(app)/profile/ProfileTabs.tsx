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
    <div
      className="flex gap-1 p-1 rounded-[var(--radius-inner)]"
      style={{ background: 'var(--bg-1)', border: '1px solid var(--glass-border)' }}
    >
      {TABS.map((tab) => (
        <button
          key={tab.id}
          onClick={() => navigate(tab.id)}
          className={cn(
            'flex-1 py-2 text-[10px] font-semibold rounded-lg transition-all tracking-widest uppercase',
          )}
          style={activeTab === tab.id
            ? { background: 'var(--accent)', color: 'var(--accent-on)' }
            : { color: 'var(--text-faint)' }
          }
        >
          {tab.label}
        </button>
      ))}
    </div>
  )
}
