import { InsightCard } from './InsightCard'
import { getAdjustedWeeklyTarget, WEEKLY_SET_TARGETS } from '@/lib/workout-intelligence'
import type { WeeklySetCount } from '@/lib/data/insights'
import type { MuscleGroup, TrainingStyle, TrainingPhase } from '@/types/database'

// ─── Weekly sets vs target — per muscle group ────────────────────────────────
//
// For each muscle group the user has trained this week, shows
//   actual / min–max-target  with a tiny status pill (under | on track | over).
//
// Target adjusts to the user's training style (volume vs intensity) and
// current phase (bulking +10%, cutting -20%, maingaining baseline). Defaults
// to volume + maingaining if those fields aren't set in the profile yet.
//
// Empty state: hidden entirely if the user logged no working sets this week.
// New users see a prompt to start their first session via other dashboard cards.

interface WeeklySetsCardProps {
  sets:  WeeklySetCount[]
  style: TrainingStyle | null
  phase: TrainingPhase | null
}

type Status = 'under' | 'on_track' | 'over'

const STATUS_STYLES: Record<Status, { dot: string; text: string; label: string }> = {
  under:    { dot: 'bg-orange-400', text: 'text-orange-400', label: 'Under'    },
  on_track: { dot: 'bg-[#CCFF00]',  text: 'text-[#CCFF00]',  label: 'On track' },
  over:     { dot: 'bg-red-400',    text: 'text-red-400',    label: 'Over'     },
}

function classify(actual: number, min: number, max: number): Status {
  if (actual < min) return 'under'
  if (actual > max) return 'over'
  return 'on_track'
}

export function WeeklySetsCard({ sets, style, phase }: WeeklySetsCardProps) {
  if (sets.length === 0) return null

  // Defaults match the algorithm fallbacks — see suggestNextSet & assessFatigueLevel
  const effectiveStyle = style ?? 'volume'
  const effectivePhase = phase ?? 'maingaining'

  // Only render rows for muscles we have published targets for (skips
  // anything custom or misnamed without crashing).
  const rows = sets
    .filter(s => s.muscleGroup in WEEKLY_SET_TARGETS)
    .map(s => {
      const target = getAdjustedWeeklyTarget(
        s.muscleGroup as MuscleGroup,
        effectiveStyle,
        effectivePhase,
      )
      return {
        muscleGroup: s.muscleGroup,
        actual:      s.setCount,
        min:         target.min,
        max:         target.max,
        status:      classify(s.setCount, target.min, target.max),
      }
    })

  if (rows.length === 0) return null

  return (
    <InsightCard title="Weekly Sets" icon="📊" variant="neutral">
      <div className="space-y-2">
        {rows.map(r => {
          const styles = STATUS_STYLES[r.status]
          // Progress bar fill — capped at 100% even when "over"
          const fillPct = Math.min(100, (r.actual / r.max) * 100)
          return (
            <div key={r.muscleGroup}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${styles.dot}`} />
                  <span className="text-xs font-black text-white uppercase tracking-tight">
                    {r.muscleGroup}
                  </span>
                </div>
                <span className="text-[10px] font-black tabular-nums text-[#adb4ce]">
                  <span className={styles.text}>{r.actual}</span>
                  <span className="text-[#334155]"> / {r.min}–{r.max}</span>
                </span>
              </div>
              <div className="h-1 w-full bg-[#0c1324] rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all ${styles.dot}`}
                  style={{ width: `${fillPct}%` }}
                />
              </div>
            </div>
          )
        })}
      </div>
      <p className="text-[10px] text-[#4a5568] font-body mt-3">
        Target adjusts to your {effectiveStyle} style on a {effectivePhase} phase.
        Update both anytime in your profile.
      </p>
    </InsightCard>
  )
}
