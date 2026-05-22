import Link from 'next/link'
import { Dumbbell, Flame } from 'lucide-react'
import { WeeklyRing } from './WeeklyRing'

interface HeroBannerProps {
  greeting:    string
  firstName:   string
  dateLabel:   string
  done:        number
  goal:        number
  streak:      number
  phaseLabel:  string | null
  phaseWeek:   number | null
  cycleLength: number | null
}

export function HeroBanner({
  greeting,
  firstName,
  dateLabel,
  done,
  goal,
  streak,
  phaseLabel,
  phaseWeek,
  cycleLength,
}: HeroBannerProps) {
  const isGoalMet = done >= goal

  return (
    <div
      className="glass p-5 mb-5 fade-up"
      style={{
        borderColor: 'var(--accent-line)',
        background: 'linear-gradient(145deg, rgba(247,37,133,0.07) 0%, rgba(247,37,133,0.02) 100%)',
      }}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-5">
        <div>
          <p className="t-label">{dateLabel}</p>
          <p className="text-[14px] mt-1" style={{ color: 'var(--text-mid)' }}>
            {greeting},{' '}
            <span style={{ color: 'var(--text-hi)' }}>{firstName}</span>
          </p>
        </div>
        {phaseLabel && (
          <span
            className="inline-flex items-center h-6 px-3 rounded-full text-[10px] font-medium tracking-widest uppercase mt-0.5"
            style={{
              background: 'var(--accent-soft)',
              color: 'var(--accent)',
              border: '1px solid var(--accent-line)',
            }}
          >
            {phaseLabel}
          </span>
        )}
      </div>

      {/* Ring */}
      <div className="flex justify-center mb-5">
        <WeeklyRing done={done} goal={goal} />
      </div>

      {/* Streak + phase week pills */}
      <div className="flex items-center justify-center gap-2 mb-5 flex-wrap">
        {streak > 0 && (
          <div
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full"
            style={{
              background: 'var(--accent-soft)',
              border: '1px solid var(--accent-line)',
            }}
          >
            <Flame className="w-3 h-3" style={{ color: 'var(--accent)' }} />
            <span
              className="text-[11px] font-semibold"
              style={{ color: 'var(--accent)' }}
            >
              {streak} week streak
            </span>
          </div>
        )}
        {phaseLabel && phaseWeek && cycleLength && (
          <div
            className="px-3 py-1.5 rounded-full"
            style={{ border: '1px solid var(--glass-border)' }}
          >
            <span
              className="mono text-[11px] tabular-nums"
              style={{ color: 'var(--text-low)' }}
            >
              Week {Math.min(phaseWeek, cycleLength)}/{cycleLength}
            </span>
          </div>
        )}
      </div>

      {/* Start workout CTA */}
      <Link href="/routines" className="block">
        <div
          className="h-12 rounded-[var(--radius-inner)] flex items-center justify-center gap-2 font-semibold text-sm transition-transform active:scale-[0.98]"
          style={{
            background: 'var(--accent)',
            color: 'var(--accent-on)',
            boxShadow: '0 4px 24px var(--accent-glow)',
          }}
        >
          <Dumbbell className="w-4 h-4" />
          {isGoalMet ? 'Keep going — Start Workout' : 'Start Workout'}
        </div>
      </Link>
    </div>
  )
}
