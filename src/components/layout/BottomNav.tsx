'use client'
import { Home, Zap, TrendingUp, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', icon: Home,        label: 'Home'     },
  { href: '/routines',  icon: Zap,         label: 'Workout'  },
  { href: '/progress',  icon: TrendingUp,  label: 'Progress' },
  { href: '/profile',   icon: User,        label: 'Me'       },
] as const

const ACTIVE_WORKOUT_PATH = '/workout'

export function BottomNav() {
  const pathname = usePathname() || ''

  // Hide the nav while a workout is in session — full-screen focus.
  if (pathname === ACTIVE_WORKOUT_PATH) return null

  return (
    <div
      className={cn(
        'fixed bottom-0 left-0 right-0 z-40',
        'px-3.5 pt-2.5 pb-7 pb-[max(env(safe-area-inset-bottom),1.75rem)]',
        'bg-[linear-gradient(180deg,transparent,rgba(6,7,13,0.6)_30%,rgba(6,7,13,0.85))]',
        'pointer-events-none',
      )}
    >
      <div
        className={cn(
          'glass glass-strong pointer-events-auto',
          'flex items-center justify-around',
          'rounded-full px-2 py-2.5',
        )}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon
          const isActive = pathname.startsWith(tab.href)
          return (
            <Link
              key={tab.href}
              href={tab.href}
              className={cn(
                'flex-1 h-11 flex flex-col items-center justify-center gap-[3px]',
                'transition-colors duration-200',
                isActive ? 'text-[var(--accent)]' : 'text-[var(--text-low)] hover:text-[var(--text-mid)]',
              )}
            >
              <Icon size={18} strokeWidth={isActive ? 2 : 1.5} />
              <span
                className={cn(
                  'text-[9px] tracking-[0.08em] uppercase',
                  isActive ? 'font-medium' : 'font-normal',
                )}
              >
                {tab.label}
              </span>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
