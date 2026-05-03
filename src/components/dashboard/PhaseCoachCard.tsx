import { Compass, TrendingUp, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import type { VolumeStatus, Mesocycle } from '@/lib/phase-coach'
import type { StrengthIndexSummary, MuscleVolumeLandmarkPoint } from '@/lib/data/phase-coach'
import type { ImprovedExercise } from '@/lib/data/insights'
import type { TrainingPhase, ExperienceLevel } from '@/types/database'
import { MesocycleTimeline } from '@/components/phase-coach/MesocycleTimeline'

interface PhaseCoachCardProps {
  trainingPhase:   TrainingPhase   | null
  experienceLevel: ExperienceLevel | null
  weeksInPhase:    number          | null
  strengthIndex:   StrengthIndexSummary
  volumeLandmarks: MuscleVolumeLandmarkPoint[]
  mostImproved:    ImprovedExercise[]
  mesocycle:       Mesocycle       | null
}

const VOLUME_STATUS_STYLES: Record<VolumeStatus, { dot: string; text: string; label: string }> = {
  below_mv:    { dot: 'bg-[var(--rose)]',    text: 'text-[var(--rose)]',    label: 'Below MV'    },
  maintenance: { dot: 'bg-orange-400',       text: 'text-orange-400',       label: 'Maintaining' },
  sub_optimal: { dot: 'bg-yellow-400',       text: 'text-yellow-400',       label: 'Sub-optimal' },
  optimal:     { dot: 'bg-[var(--accent)]',  text: 'text-[var(--accent)]',  label: 'Optimal'     },
  high:        { dot: 'bg-orange-400',       text: 'text-orange-400',       label: 'High'        },
  over_mrv:    { dot: 'bg-[var(--rose)]',    text: 'text-[var(--rose)]',    label: 'Over MRV'    },
}

const STATUS_PRIORITY: Record<VolumeStatus, number> = {
  over_mrv: 0, below_mv: 1, maintenance: 2, sub_optimal: 3, high: 4, optimal: 5,
}

export function PhaseCoachCard({
  trainingPhase,
  experienceLevel,
  weeksInPhase,
  strengthIndex,
  volumeLandmarks,
  mostImproved,
  mesocycle,
}: PhaseCoachCardProps) {
  const phaseLabel  = trainingPhase ? trainingPhase.toUpperCase() : null
  const cycleLength = (trainingPhase && experienceLevel)
    ? DELOAD_THRESHOLDS[experienceLevel][trainingPhase]
    : null

  const sortedLandmarks = [...volumeLandmarks].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
  )
  const topImproved = mostImproved[0] ?? null

  return (
    <div className="glass p-4">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
          <h3 className="t-label">Phase Coach</h3>
        </div>
        {phaseLabel && (
          <span className="t-label text-[var(--accent)] bg-[var(--accent-soft)] border border-[var(--accent-line)] rounded px-2 py-0.5">
            {phaseLabel}
            {weeksInPhase && cycleLength
              ? ` · WK ${Math.min(weeksInPhase, cycleLength + 4)} / ${cycleLength}`
              : weeksInPhase ? ` · WK ${weeksInPhase}` : ''}
          </span>
        )}
      </div>

      {mesocycle && (
        <div className="mb-4">
          <MesocycleTimeline mesocycle={mesocycle} compact />
        </div>
      )}

      <StrengthIndexSection summary={strengthIndex} />

      {/* Volume landmarks */}
      <div className="mt-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="t-label">Volume · This Week</p>
          <p className="t-caption">sets / week</p>
        </div>
        <div className="space-y-2.5">
          {sortedLandmarks.map(point => (
            <VolumeLandmarkRow key={point.muscleGroup} point={point} />
          ))}
        </div>
      </div>

      {/* Most improved */}
      {topImproved && (
        <div className="pt-3 border-t border-white/[0.05]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="t-label mb-1">Most Improved</p>
              <p className="text-[13px] font-medium text-[var(--text-hi)] truncate">{topImproved.exerciseName}</p>
              <p className="mono text-[10px] text-[var(--text-low)] mt-0.5 tabular-nums">
                {topImproved.previousBest.toFixed(1)} → {topImproved.recentBest.toFixed(1)} kg e1RM
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-[var(--teal)]" />
              <span className="mono text-base font-medium text-[var(--accent)]">
                +{topImproved.improvementPct}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Honesty footer */}
      <div className="mt-4 pt-3 border-t border-white/[0.05] flex items-start gap-2">
        <Info className="w-3 h-3 text-[var(--text-faint)] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--text-low)] leading-relaxed">
          Strength gain is a <span className="text-[var(--text-mid)] font-medium">proxy</span> for muscle gain, not a direct measure. Also track bodyweight and photos.
        </p>
      </div>
    </div>
  )
}

function StrengthIndexSection({ summary }: { summary: StrengthIndexSummary }) {
  if (summary.history.length < 3) {
    return (
      <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-3">
        <p className="t-label mb-1">Strength Index</p>
        <p className="text-[11px] text-[var(--text-low)] leading-relaxed">
          {summary.liftCount < 3
            ? 'Train 3+ compound lifts to start tracking an Index.'
            : 'Log a few more weeks to start tracking your Index.'}
        </p>
      </div>
    )
  }

  const last     = summary.history[summary.history.length - 1].index
  const first    = summary.history[0].index
  const totalPct = ((last - first) / first) * 100
  const pctPerWeek = summary.pctPerWeek

  const trendColor =
    summary.status === 'on_track'       ? 'text-[var(--teal)]'  :
    summary.status === 'above_expected' ? 'text-[var(--teal)]'  :
    summary.status === 'below_expected' ? 'text-orange-400'     :
    'text-[var(--text-mid)]'

  const trendLabel =
    summary.status === 'on_track'       ? 'on track'       :
    summary.status === 'above_expected' ? 'above expected' :
    summary.status === 'below_expected' ? 'below expected' :
    null

  return (
    <div className="bg-white/[0.03] border border-white/[0.06] rounded-[14px] p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="t-label">Strength Index</p>
        {pctPerWeek !== null && (
          <span className={cn('text-[10px] font-medium mono tabular-nums', trendColor)}>
            {pctPerWeek >= 0 ? '+' : ''}{pctPerWeek.toFixed(2)}%/wk
            {trendLabel && <span className="text-[var(--text-low)] ml-1.5">· {trendLabel}</span>}
          </span>
        )}
      </div>
      <div className="flex items-end gap-3">
        <div className="flex-1 h-10">
          <Sparkline points={summary.history.map(p => p.index)} />
        </div>
        <div className="text-right shrink-0">
          <p className="mono text-[18px] font-medium text-[var(--text-hi)] tabular-nums leading-none">
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}<span className="text-xs text-[var(--text-low)] ml-0.5">%</span>
          </p>
          <p className="t-caption mt-0.5">since start</p>
        </div>
      </div>
      <p className="text-[9px] text-[var(--text-faint)] mt-2">
        Avg across {summary.liftCount} key lift{summary.liftCount === 1 ? '' : 's'}, weekly best e1RM, normalised to phase start.
      </p>
    </div>
  )
}

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1
  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * 100
    const y = 100 - ((v - min) / range) * 90 - 5
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')
  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function VolumeLandmarkRow({ point }: { point: MuscleVolumeLandmarkPoint }) {
  const { muscleGroup, setCount, weeklyFrequency, landmarks, status } = point
  const styles = VOLUME_STATUS_STYLES[status]

  const scaleMax  = Math.max(landmarks.mrv * 1.2, setCount * 1.05, 1)
  const pct       = (n: number) => Math.min(100, (n / scaleMax) * 100)
  const mvPct     = pct(landmarks.mv)
  const mevPct    = pct(landmarks.mev)
  const mavMinPct = pct(landmarks.mav.min)
  const mavMaxPct = pct(landmarks.mav.max)
  const mrvPct    = pct(landmarks.mrv)
  const markerPct = pct(setCount)

  const freqSessions = weeklyFrequency > 0 ? Math.max(1, Math.round(weeklyFrequency)) : 0
  const freqLabel    = freqSessions > 0 ? `${freqSessions}×/wk` : null
  const freqColor    = freqSessions >= 2
    ? 'text-[var(--teal)] bg-[var(--teal)]/10'
    : 'text-yellow-400 bg-yellow-400/10'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)} />
          <span className="text-[11px] font-medium text-[var(--text-hi)] truncate">{muscleGroup}</span>
          {freqLabel && (
            <span className={cn('text-[8px] font-medium uppercase tracking-widest px-1 py-0.5 rounded shrink-0', freqColor)}>
              {freqLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="mono text-[10px] tabular-nums text-[var(--text-mid)]">
            {setCount}
            <span className="text-[var(--text-faint)] ml-1">/ {landmarks.mev}–{landmarks.mav.max}</span>
          </span>
          <span className={cn('text-[8px] font-medium uppercase tracking-widest w-[58px] text-right', styles.text)}>
            {styles.label}
          </span>
        </div>
      </div>
      <div className="relative h-1.5 bg-white/[0.04] rounded-full overflow-visible">
        <div className="absolute top-0 h-full bg-orange-400/15 rounded-full"
          style={{ left: `${mvPct}%`, width: `${Math.max(0, mevPct - mvPct)}%` }} />
        <div className="absolute top-0 h-full bg-yellow-400/20"
          style={{ left: `${mevPct}%`, width: `${Math.max(0, mavMinPct - mevPct)}%` }} />
        <div className="absolute top-0 h-full bg-[var(--accent)]/25"
          style={{ left: `${mavMinPct}%`, width: `${Math.max(0, mavMaxPct - mavMinPct)}%` }} />
        <div className="absolute top-0 h-full bg-orange-400/20"
          style={{ left: `${mavMaxPct}%`, width: `${Math.max(0, mrvPct - mavMaxPct)}%` }} />
        <div className="absolute top-0 h-full bg-[var(--rose)]/30 rounded-r-full"
          style={{ left: `${mrvPct}%`, right: 0 }} />
        <div className={cn('absolute -top-0.5 bottom-[-2px] w-0.5 rounded-full', styles.dot)}
          style={{ left: `${markerPct}%`, transform: 'translateX(-50%)' }} />
      </div>
    </div>
  )
}
