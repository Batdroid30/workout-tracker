import { Dumbbell, House, Sparkles, TrendingUp, type LucideIcon } from 'lucide-react'

export type TabId = 'home' | 'train' | 'progress' | 'coach'

interface NavTab {
  id: TabId
  href: string
  label: string
  icon: LucideIcon
}

export const NAV_TABS: readonly NavTab[] = [
  { id: 'home',     href: '/dashboard', label: 'Home',     icon: House      },
  { id: 'train',    href: '/routines',  label: 'Train',    icon: Dumbbell   },
  { id: 'progress', href: '/progress',  label: 'Progress', icon: TrendingUp },
  { id: 'coach',    href: '/coach',     label: 'Coach',    icon: Sparkles   },
] as const

// Pages reached from a tab keep that tab highlighted. Account opens from
// Home; history, exercises and finished-workout detail belong to Progress.
const ROUTE_PREFIXES: readonly { prefix: string; tab: TabId }[] = [
  { prefix: '/dashboard', tab: 'home' },
  { prefix: '/account',   tab: 'home' },
  { prefix: '/routines',  tab: 'train' },
  { prefix: '/progress',  tab: 'progress' },
  { prefix: '/history',   tab: 'progress' },
  { prefix: '/exercises', tab: 'progress' },
  { prefix: '/coach',     tab: 'coach' },
]

function matchesPrefix(pathname: string, prefix: string): boolean {
  return pathname === prefix || pathname.startsWith(`${prefix}/`)
}

export function getActiveTab(pathname: string): TabId | null {
  // `/workout` alone is the live session (no nav); `/workout/<id>` is a
  // finished workout viewed from history.
  if (pathname.startsWith('/workout/')) return 'progress'
  const match = ROUTE_PREFIXES.find(route => matchesPrefix(pathname, route.prefix))
  return match?.tab ?? null
}

// While a workout runs, the workout bar offers Resume, so the tab bar doesn't.
export function getAccessory(hasActiveWorkout: boolean) {
  return hasActiveWorkout ? null : { label: 'Start workout', href: '/routines' } as const
}
