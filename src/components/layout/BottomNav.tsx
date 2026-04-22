'use client'
import { Home, Dumbbell, TrendingUp, List, User } from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'

const tabs = [
  { href: '/dashboard', icon: Home,       label: 'Home' },
  { href: '/routines',  icon: List,       label: 'Routines' },
  { href: '/workout',   icon: Dumbbell,   label: 'Workout' },
  { href: '/progress',  icon: TrendingUp, label: 'Progress' },
  { href: '/profile',   icon: User,       label: 'Profile' },
]

export function BottomNav() {
  const pathname = usePathname() || ''

  return (
    <div className="fixed bottom-0 left-0 right-0 h-[65px] bg-zinc-950/90 backdrop-blur-md border-t border-zinc-900 pb-safe z-40 px-2 flex items-center justify-around font-sans">
      {tabs.map((tab) => {
        const isActive = pathname.startsWith(tab.href)
        const Icon = tab.icon
        return (
          <Link 
            key={tab.href} 
            href={tab.href}
            className={cn(
              "flex flex-col items-center justify-center w-16 h-full transition-colors active:scale-95",
              isActive ? "text-white" : "text-zinc-600 hover:text-zinc-400"
            )}
          >
            <Icon className="w-6 h-6 mb-1" strokeWidth={isActive ? 2.5 : 2} />
            <span className="text-[10px] font-bold tracking-wide">{tab.label}</span>
          </Link>
        )
      })}
    </div>
  )
}
