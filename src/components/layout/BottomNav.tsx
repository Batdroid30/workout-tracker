'use client'
import { useSyncExternalStore } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { getButtonClassName } from '@/components/ui'
import { useWorkoutStore } from '@/store/workout.store'
import { useCollapseOnScroll } from '@/hooks/useCollapseOnScroll'
import { NAV_TABS, getAccessory, getActiveTab, type TabId } from './nav-config'

const ACTIVE_WORKOUT_PATH = '/workout'

const subscribeNever = () => () => {}

interface Accessory {
  label: string
  href: string
}

interface BottomNavBarProps {
  activeTab: TabId | null
  collapsed: boolean
  accessory: Accessory | null
  onExpand: () => void
}

// The one sanctioned blur in the system: a near-solid tinted capsule.
const CAPSULE =
  'h-16 rounded-pill bg-surface-raised/92 backdrop-blur-[20px] backdrop-saturate-[1.4] border border-border-strong shadow-[var(--shadow-overlay)]'

const MOTION = 'transition-all duration-200 ease-out motion-reduce:transition-none'

// A tap on the collapsed bar reveals the tabs; it must not navigate away
// from a sub-page (unsaved routine edits, a loaded history list).
export function collapsedTabClick(onExpand: () => void) {
  return (event: { preventDefault: () => void }) => {
    event.preventDefault()
    onExpand()
  }
}

export function BottomNavBar({ activeTab, collapsed, accessory, onExpand }: BottomNavBarProps) {
  const activeIndex = NAV_TABS.findIndex(tab => tab.id === activeTab)
  const showAccessory = collapsed && accessory !== null

  return (
    <div
      className="fixed left-3.5 right-3.5 z-40 flex items-center gap-3 pointer-events-none"
      style={{ bottom: 'calc(18px + env(safe-area-inset-bottom))' }}
    >
      <nav
        aria-label="Main"
        onFocus={collapsed ? onExpand : undefined}
        className={cn(CAPSULE, MOTION, 'relative pointer-events-auto px-1.5', collapsed ? 'w-16' : 'w-full')}
      >
        {!collapsed && activeIndex >= 0 && (
          <span
            aria-hidden="true"
            className={cn('absolute top-1.5 left-1.5 h-[52px] rounded-pill bg-accent-soft', MOTION)}
            style={{
              width: `calc((100% - 12px) / ${NAV_TABS.length})`,
              transform: `translateX(${activeIndex * 100}%)`,
            }}
          />
        )}
        <ul className="relative flex h-full items-center">
          {NAV_TABS.map(tab => {
            const isActive = tab.id === activeTab
            if (collapsed && !isActive) return null
            const Icon = tab.icon
            return (
              <li key={tab.id} className="flex-1 flex justify-center">
                <Link
                  href={tab.href}
                  aria-current={isActive ? 'page' : undefined}
                  onClick={collapsed ? collapsedTabClick(onExpand) : undefined}
                  className={cn(
                    'flex min-h-11 w-full flex-col items-center justify-center gap-0.5 rounded-pill',
                    collapsed && 'h-[52px] w-[52px] bg-accent-soft',
                    isActive ? 'text-accent' : 'text-tertiary hover:text-secondary',
                  )}
                >
                  <Icon size={20} strokeWidth={isActive ? 2 : 1.75} aria-hidden="true" />
                  <span className={cn('text-xs', isActive && 'font-medium', collapsed && 'sr-only')}>
                    {tab.label}
                  </span>
                </Link>
              </li>
            )
          })}
        </ul>
      </nav>

      {showAccessory && (
        <Link
          href={accessory.href}
          className={cn(
            getButtonClassName({ variant: 'primary', fullWidth: false }),
            'h-16 flex-1 pointer-events-auto shadow-[var(--shadow-overlay)]',
          )}
        >
          {accessory.label}
        </Link>
      )}
    </div>
  )
}

export function BottomNav() {
  const pathname = usePathname() || ''
  const activeTab = getActiveTab(pathname)
  const hasActiveWorkout = useWorkoutStore(state => state.activeWorkout !== null)
  const { collapsed, expand } = useCollapseOnScroll(activeTab !== null)

  // The persisted workout store only knows the real value on the client,
  // so the accessory waits until hydration to avoid a Start→Resume flash.
  const mounted = useSyncExternalStore(subscribeNever, () => true, () => false)

  if (pathname === ACTIVE_WORKOUT_PATH) return null

  return (
    <BottomNavBar
      activeTab={activeTab}
      collapsed={collapsed}
      accessory={mounted ? getAccessory(hasActiveWorkout) : null}
      onExpand={expand}
    />
  )
}
