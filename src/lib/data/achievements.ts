import { cache } from 'react'
import { getSupabaseAdmin } from '@/lib/supabase/server'
import { DatabaseError } from '@/lib/errors'

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Badge {
  id: string
  label: string
  description: string
  /** Lucide icon name — resolved to a component in the UI layer */
  icon: string
  /** CSS color value, e.g. 'var(--accent)' or '#f59e0b' */
  color: string
  earned: boolean
}

// ── Badge Definitions ─────────────────────────────────────────────────────────

const WORKOUT_BADGES: Array<Omit<Badge, 'earned'> & { threshold: number }> = [
  { id: 'workouts_1',   icon: 'dumbbell', color: 'var(--text-mid)', label: 'First Rep',    description: 'Complete your first workout',  threshold: 1   },
  { id: 'workouts_10',  icon: 'dumbbell', color: 'var(--text-hi)',  label: 'Iron Starter', description: '10 workouts completed',         threshold: 10  },
  { id: 'workouts_25',  icon: 'zap',      color: 'var(--accent)',   label: 'Consistent',   description: '25 workouts completed',         threshold: 25  },
  { id: 'workouts_50',  icon: 'zap',      color: '#f59e0b',         label: 'Dedicated',    description: '50 workouts completed',         threshold: 50  },
  { id: 'workouts_100', icon: 'shield',   color: '#f59e0b',         label: 'Century Club', description: '100 workouts completed',        threshold: 100 },
]

const VOLUME_BADGES: Array<Omit<Badge, 'earned'> & { threshold: number }> = [
  { id: 'volume_1k',   icon: 'bar-chart-2', color: 'var(--text-mid)', label: '1k Club',      description: '1,000 kg lifted total',         threshold: 1_000     },
  { id: 'volume_10k',  icon: 'bar-chart-2', color: 'var(--text-hi)',  label: '10k Club',     description: '10,000 kg lifted total',        threshold: 10_000    },
  { id: 'volume_100k', icon: 'bar-chart-2', color: '#f59e0b',         label: '100k Club',    description: '100,000 kg lifted total',       threshold: 100_000   },
  { id: 'volume_500k', icon: 'trophy',      color: 'var(--accent)',   label: 'Half Million', description: '500,000 kg lifted total',       threshold: 500_000   },
  { id: 'volume_1m',   icon: 'crown',       color: '#f59e0b',         label: 'Iron Legend',  description: '1,000,000 kg lifted total',     threshold: 1_000_000 },
]

const PR_BADGES: Array<Omit<Badge, 'earned'> & { threshold: number }> = [
  { id: 'prs_1',  icon: 'target',      color: 'var(--text-mid)', label: 'First Blood',   description: 'Set your first personal record', threshold: 1  },
  { id: 'prs_5',  icon: 'trending-up', color: 'var(--accent)',   label: 'Record Setter', description: '5 personal records set',          threshold: 5  },
  { id: 'prs_25', icon: 'trending-up', color: '#f59e0b',         label: 'PR Machine',    description: '25 personal records set',         threshold: 25 },
]

const STREAK_BADGES: Array<Omit<Badge, 'earned'> & { threshold: number }> = [
  { id: 'streak_4',  icon: 'flame', color: 'var(--text-mid)', label: 'Monthly Mover',   description: '4-week training streak',  threshold: 4  },
  { id: 'streak_8',  icon: 'flame', color: 'var(--accent)',   label: 'Two-Month Grind', description: '8-week training streak',  threshold: 8  },
  { id: 'streak_12', icon: 'flame', color: '#f59e0b',         label: 'Quarter Beast',   description: '12-week training streak', threshold: 12 },
]

// ── Helper ────────────────────────────────────────────────────────────────────

function getMondayOf(date: Date): string {
  const d = new Date(date)
  const day = d.getUTCDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setUTCDate(d.getUTCDate() + diff)
  return d.toISOString().split('T')[0]
}

// ── Cached read function ──────────────────────────────────────────────────────

export const getBadges = cache(async (
  userId: string,
  totalVolume: number,
  totalWorkouts: number,
): Promise<Badge[]> => {
  const supabase = getSupabaseAdmin()

  const [prResult, workoutResult] = await Promise.all([
    supabase.from('personal_records').select('id', { count: 'exact', head: true }).eq('user_id', userId),
    supabase.from('workouts').select('started_at').eq('user_id', userId),
  ])

  if (prResult.error)      throw new DatabaseError('Failed to count PRs for badges', prResult.error)
  if (workoutResult.error) throw new DatabaseError('Failed to fetch workouts for badges', workoutResult.error)

  const prCount      = prResult.count ?? 0
  const workoutDates = workoutResult.data ?? []

  const weekSet = new Set(workoutDates.map(w => getMondayOf(new Date(w.started_at))))
  const weeks   = Array.from(weekSet).sort()

  let longestStreak = 0, runningStreak = 0
  let prevWeek: string | null = null
  for (const week of weeks) {
    if (prevWeek === null) { runningStreak = 1 }
    else {
      const next = new Date(prevWeek)
      next.setUTCDate(next.getUTCDate() + 7)
      runningStreak = week === next.toISOString().split('T')[0] ? runningStreak + 1 : 1
    }
    if (runningStreak > longestStreak) longestStreak = runningStreak
    prevWeek = week
  }

  return [
    ...WORKOUT_BADGES.map(b => ({ ...b, earned: totalWorkouts >= b.threshold })),
    ...VOLUME_BADGES.map(b  => ({ ...b, earned: totalVolume  >= b.threshold })),
    ...PR_BADGES.map(b      => ({ ...b, earned: prCount      >= b.threshold })),
    ...STREAK_BADGES.map(b  => ({ ...b, earned: longestStreak >= b.threshold })),
  ]
})
