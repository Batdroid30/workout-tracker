'use client'

import { useRouter, useSearchParams } from 'next/navigation'
import { useTransition, useState, type ReactNode } from 'react'
import { Skeleton } from '@/components/ui/Skeleton'
import { cn } from '@/lib/utils'

type Tab = 'stats' | 'history' | 'exercises' | 'account'

const TABS: { id: Tab; label: string }[] = [
  { id: 'stats',     label: 'Stats'     },
  { id: 'history',   label: 'History'   },
  { id: 'exercises', label: 'Exercises' },
  { id: 'account',   label: 'Account'   },
]

interface ProfileContentProps {
  activeTab: Tab
  children: ReactNode
}

/**
 * Owns the tab bar + content area. Uses useTransition so:
 *  1. Tab click → pendingTab updates immediately → correct skeleton shows (0 ms delay)
 *  2. Server re-renders with new data → isPending false → content slides in
 */
export function ProfileContent({ activeTab, children }: ProfileContentProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [isPending, startTransition] = useTransition()
  const [pendingTab, setPendingTab]  = useState<Tab>(activeTab)

  function navigate(tab: Tab) {
    if (tab === activeTab && !isPending) return
    setPendingTab(tab)
    const params = new URLSearchParams(searchParams.toString())
    params.set('tab', tab)
    startTransition(() => router.push(`/profile?${params}`))
  }

  // Which tab to use for skeleton label / active highlight while in-flight
  const displayTab = isPending ? pendingTab : activeTab

  return (
    <>
      {/* ── Tab bar ───────────────────────────────────────────────── */}
      <div className="px-5 pt-4 pb-1">
      <div
        className="flex gap-1 p-1 rounded-[var(--radius-inner)]"
        style={{ background: 'var(--bg-1)', border: '1px solid var(--glass-border)' }}
      >
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => navigate(tab.id)}
            className={cn(
              'flex-1 py-2 text-[10px] font-semibold rounded-lg transition-all tracking-widest uppercase',
            )}
            style={displayTab === tab.id
              ? { background: 'var(--accent)', color: 'var(--accent-on)' }
              : { color: 'var(--text-faint)' }
            }
          >
            {tab.label}
          </button>
        ))}
      </div>
      </div>

      {/* ── Tab content ───────────────────────────────────────────── */}
      <div className="mt-5 px-5">
        {isPending
          ? <TabSkeleton tab={pendingTab} />
          : <div key={activeTab} className="page-in">{children}</div>
        }
      </div>
    </>
  )
}

// ─── Per-tab skeletons ────────────────────────────────────────────────────────

function TabSkeleton({ tab }: { tab: Tab }) {
  if (tab === 'stats') return <StatsSkeleton />
  if (tab === 'history') return <HistorySkeleton />
  if (tab === 'exercises') return <ExercisesSkeleton />
  return <AccountSkeleton />
}

function StatsSkeleton() {
  return (
    <div className="space-y-6">
      {/* PR table */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-36 rounded" />
          <Skeleton className="h-6 w-24 rounded-lg" />
        </div>
        <div className="space-y-2">
          {[1, 2, 3, 4, 5].map(i => (
            <div key={i} className="glass flex items-center justify-between p-3 rounded-[var(--radius-card)]">
              <div className="flex items-center gap-3">
                <Skeleton className="w-7 h-7 rounded-lg shrink-0" />
                <Skeleton className="h-4 w-32 rounded" />
              </div>
              <Skeleton className="h-4 w-14 rounded" />
            </div>
          ))}
        </div>
      </section>

      {/* Volume chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-6 w-16 rounded-lg" />
        </div>
        <div className="glass p-4 rounded-[var(--radius-card)]">
          <Skeleton className="h-9 w-28 mb-4 rounded" />
          <Skeleton className="h-[180px] w-full rounded-[var(--radius-inner)]" />
        </div>
      </section>

      {/* Radar chart */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <Skeleton className="h-5 w-28 rounded" />
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
        <div className="glass p-4 rounded-[var(--radius-card)]">
          <Skeleton className="h-[240px] w-full rounded-[var(--radius-inner)]" />
        </div>
      </section>

      {/* Tonnage */}
      <section>
        <Skeleton className="h-5 w-40 rounded mb-3" />
        <div className="glass p-4 rounded-[var(--radius-card)]">
          <Skeleton className="h-9 w-32 rounded mb-3" />
          <Skeleton className="h-1.5 w-full rounded-full" />
        </div>
      </section>
    </div>
  )
}

function HistorySkeleton() {
  return (
    <div className="space-y-3">
      <div className="flex justify-end pb-2">
        <Skeleton className="h-8 w-28 rounded-[var(--radius-pill)]" />
      </div>
      {[1, 2, 3, 4, 5].map(i => (
        <div key={i} className="glass p-4 rounded-[var(--radius-card)]">
          <div className="flex justify-between items-start mb-3">
            <div>
              <Skeleton className="h-4 w-32 rounded mb-2" />
              <Skeleton className="h-3 w-20 rounded" />
            </div>
            <Skeleton className="h-6 w-14 rounded-lg" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full mb-3" />
          <div className="h-px mb-2" style={{ background: 'var(--glass-border)' }} />
          <Skeleton className="h-3 w-48 rounded" />
        </div>
      ))}
    </div>
  )
}

function ExercisesSkeleton() {
  return (
    <div className="-mx-5">
      <div className="px-5 pb-3">
        <Skeleton className="h-10 w-full rounded-[var(--radius-inner)]" />
      </div>
      {[1, 2, 3, 4, 5, 6, 7].map(i => (
        <div
          key={i}
          className="flex items-center justify-between py-3 px-5"
          style={{ borderBottom: '1px solid var(--glass-border)' }}
        >
          <div>
            <Skeleton className="h-4 w-36 rounded mb-1.5" />
            <Skeleton className="h-3 w-20 rounded" />
          </div>
          <Skeleton className="w-4 h-4 rounded" />
        </div>
      ))}
    </div>
  )
}

function AccountSkeleton() {
  return (
    <div className="space-y-5">
      {[1, 2, 3, 4].map(i => (
        <div key={i}>
          <Skeleton className="h-3 w-20 rounded mb-1.5" />
          <Skeleton className="h-11 w-full rounded-[var(--radius-inner)]" />
        </div>
      ))}
      <Skeleton className="h-11 w-full rounded-[var(--radius-pill)] mt-4" />
    </div>
  )
}
