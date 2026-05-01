'use client'
import { Home, List, User, TrendingUp } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', icon: 'home',     label: 'Home'     },
  { href: '/routines',  icon: 'list',     label: 'Routines' },
  { href: '/workout',   icon: 'logo',     label: 'Workout'  },
  { href: '/progress',  icon: 'progress', label: 'Progress' },
  { href: '/profile',   icon: 'user',     label: 'Me'       },
] as const

type TabIcon = typeof tabs[number]['icon']

function TabIcon({ icon, isActive }: { icon: TabIcon; isActive: boolean }) {
  if (icon === 'logo') {
    // Workout tab uses the app logo as its icon
    return (
      <div className={cn(
        'w-8 h-8 rounded-lg overflow-hidden mb-1 transition-all',
        isActive
          ? 'ring-2 ring-[#CCFF00] ring-offset-1 ring-offset-[#020617] scale-110'
          : 'opacity-60',
      )}>
        <Image
          src="/icons/icon-192.png"
          alt="Workout"
          width={32}
          height={32}
          className="w-full h-full object-cover"
          priority
        />
      </div>
    )
  }

  const iconMap = { home: Home, list: List, user: User, progress: TrendingUp }
  const Icon = iconMap[icon as keyof typeof iconMap]
  return <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.5 : 2} />
}

export function BottomNav() {
  const pathname = usePathname() || ''

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[65px] bg-[#020617]/90 backdrop-blur-xl border-t border-[#334155] pb-safe z-40 px-4 flex items-center justify-around font-sans shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        // /workout is only active for the live session page, not history logs (/workout/123)
        const isActive = tab.href === '/workout'
          ? pathname === '/workout'
          : pathname.startsWith(tab.href)

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex flex-col items-center justify-center w-16 h-full transition-all active:translate-y-[-2px]',
              isActive ? 'text-[#CCFF00]' : 'text-[#334155] hover:text-[#adb4ce]',
            )}
          >
            <TabIcon icon={tab.icon} isActive={isActive} />
            <span className={cn(
              'text-[10px] font-bold tracking-widest uppercase',
              isActive ? 'text-[#CCFF00]' : 'text-[#4a5568]',
            )}>
              {tab.label}
            </span>
          </Link>
        )
      })}
    </div>
  )
}
