'use client'
import { Home, Dumbbell, List, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', icon: Home,     label: 'Home' },
  { href: '/routines',  icon: List,     label: 'Routines' },
  { href: '/workout',   icon: Dumbbell, label: 'Workout' },
  { href: '/profile',   icon: User,     label: 'Me' },
]

export function BottomNav() {
  const pathname = usePathname() || ''

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[65px] bg-[#020617]/90 backdrop-blur-xl border-t border-[#334155] pb-safe z-40 px-4 flex items-center justify-around font-sans shadow-[0_-4px_20px_rgba(0,0,0,0.5)]">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        const Icon = tab.icon
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full transition-all active:translate-y-[-2px]",
              isActive ? "text-[#CCFF00]" : "text-[#334155] hover:text-[#adb4ce]"
            )}
          >
            <Icon className="w-5 h-5 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className={cn(
              "text-[10px] font-bold tracking-widest uppercase",
              isActive ? "text-[#CCFF00]" : "text-[#4a5568]"
            )}>{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
