import { Compass, TrendingUp, TrendingDown, Minus, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import type { VolumeStatus, Mesocycle } from '@/lib/phase-coach'
import type {
  StrengthIndexSummary,
  MuscleVolumeLandmarkPoint,
} from '@/lib/data/phase-coach'
import type { ImprovedExercise } from '@/lib/data/insights'
import type { TrainingPhase, ExperienceLevel } from '@/types/database'
import { MesocycleTimeline } from '@/components/phase-coach/MesocycleTimeline'

// ─── Phase Coach card ────────────────────────────────────────────────────────
//
// One card answering "is my phase actually working?"
//
//   1. Phase header — current phase + week N of recommended mesocycle
//   2. Strength Index — normalised e1RM trend across auto-detected key lifts,
//      with rate-vs-expected gauge
//   3. Volume Landmarks — per-muscle bar showing where this week's set count
//      lands in the MV/MEV/MAV/MRV bands, sorted worst-first
//   4. Most Improved — single-line highlight folded in from MostImprovedCard
//
// Honesty layer:
//   • Strength is a *proxy* for hypertrophy — always disclosed in a footer
//   • Index hidden until ≥3 key lifts and ≥3 weeks of data
//   • Status grade ('on track' / 'below') only shown when training_phase +
//     experience_level are set on the profile

interface PhaseCoachCardProps {
  trainingPhase:    TrainingPhase    | null
  experienceLevel:  ExperienceLevel  | null
  /** Weeks elapsed since phase_started_at (1-indexed, computed server-side). */
  weeksInPhase:     number           | null
  strengthIndex:    StrengthIndexSummary
  volumeLandmarks:  MuscleVolumeLandmarkPoint[]
  mostImproved:     ImprovedExercise[]
  /** Mesocycle strip — null when phase_started_at is unset. */
  mesocycle:        Mesocycle        | null
}

// ── Status styling ──────────────────────────────────────────────────────────

const VOLUME_STATUS_STYLES: Record<VolumeStatus, { dot: string; text: string; label: string }> = {
  below_mv:    { dot: 'bg-red-400',     text: 'text-red-400',     label: 'Below MV'    },
  maintenance: { dot: 'bg-orange-400',  text: 'text-orange-400',  label: 'Maintaining' },
  sub_optimal: { dot: 'bg-yellow-400',  text: 'text-yellow-400',  label: 'Sub-optimal' },
  optimal:     { dot: 'bg-[#CCFF00]',   text: 'text-[#CCFF00]',   label: 'Optimal'     },
  high:        { dot: 'bg-orange-400',  text: 'text-orange-400',  label: 'High'        },
  over_mrv:    { dot: 'bg-red-500',     text: 'text-red-500',     label: 'Over MRV'    },
}

// Sort priority — worst (most actionable) first
const STATUS_PRIORITY: Record<VolumeStatus, number> = {
  over_mrv: 0, below_mv: 1, maintenance: 2, sub_optimal: 3, high: 4, optimal: 5,
}

// ── Component ────────────────────────────────────────────────────────────────

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
    <div className="glass-panel border border-[#334155] rounded-xl p-4">
      {/* ── Header ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[#CCFF00]" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce]">
            Phase Coach
          </h3>
        </div>
        {phaseLabel && (
          <span className="text-[10px] font-black uppercase tracking-widest text-[#CCFF00] bg-[#CCFF00]/5 border border-[#CCFF00]/20 rounded px-2 py-0.5">
            {phaseLabel}
            {weeksInPhase && cycleLength
              ? ` · WK ${Math.min(weeksInPhase, cycleLength + 4)} / ${cycleLength}`
              : weeksInPhase ? ` · WK ${weeksInPhase}` : ''}
          </span>
        )}
      </div>

      {/* ── Mesocycle timeline ──────────────────────────────────────── */}
      {mesocycle && (
        <div className="mb-4">
          <MesocycleTimeline mesocycle={mesocycle} compact />
        </div>
      )}

      {/* ── Strength Index ──────────────────────────────────────────── */}
      <StrengthIndexSection summary={strengthIndex} />

      {/* ── Volume Landmarks ────────────────────────────────────────── */}
      <div className="mt-5 mb-4">
        <div className="flex items-center justify-between mb-2">
          <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5568]">
            Volume Landmarks · This Week
          </p>
          <p className="text-[9px] font-body text-[#334155]">sets / week</p>
        </div>
        <div className="space-y-2.5">
          {sortedLandmarks.map(point => (
            <VolumeLandmarkRow key={point.muscleGroup} point={point} />
          ))}
        </div>
      </div>

      {/* ── Most Improved highlight ─────────────────────────────────── */}
      {topImproved && (
        <div className="mt-4 pt-3 border-t border-[#1e293b]">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5568] mb-1">
                Most Improved
              </p>
              <p className="text-sm font-black text-white uppercase tracking-tight truncate">
                {topImproved.exerciseName}
              </p>
              <p className="text-[10px] text-[#4a5568] font-body mt-0.5 tabular-nums">
                {topImproved.previousBest.toFixed(1)} → {topImproved.recentBest.toFixed(1)} kg e1RM
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <TrendingUp className="w-3.5 h-3.5 text-[#CCFF00]" />
              <span className="text-base font-black text-[#CCFF00] tracking-tight">
                +{topImproved.improvementPct}%
              </span>
            </div>
          </div>
        </div>
      )}

      {/* ── Honesty footer ─────────────────────────────────────────── */}
      <div className="mt-4 pt-3 border-t border-[#1e293b] flex items-start gap-2">
        <Info className="w-3 h-3 text-[#334155] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#4a5568] font-body leading-relaxed">
          Strength gain is a <span className="text-[#adb4ce] font-black">proxy</span> for muscle gain, not a direct measure.
          For a complete picture, also track bodyweight and progress photos.
        </p>
      </div>
    </div>
  )
}

// ── Strength Index sub-section ──────────────────────────────────────────────

function StrengthIndexSection({ summary }: { summary: StrengthIndexSummary }) {
  if (summary.history.length < 3) {
    return (
      <div className="bg-[#0c1324] border border-[#1e293b] rounded-lg p-3">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#4a5568] mb-1">
          Strength Index
        </p>
        <p className="text-[11px] text-[#4a5568] font-body leading-relaxed">
          {summary.liftCount < 3
            ? 'Train 3+ different compound lifts so we can track an Index.'
            : 'Log a few weeks of compound lifts to start tracking your Index.'}
        </p>
      </div>
    )
  }

  const last  = summary.history[summary.history.length - 1].index
  const first = summary.history[0].index
  const totalPct = ((last - first) / first) * 100
  const pctPerWeek = summary.pctPerWeek

  const trendColor =
    summary.status === 'on_track'       ? 'text-[#CCFF00]' :
    summary.status === 'above_expected' ? 'text-[#CCFF00]' :
    summary.status === 'below_expected' ? 'text-orange-400' :
    'text-[#adb4ce]'

  const trendLabel =
    summary.status === 'on_track'       ? 'on track' :
    summary.status === 'above_expected' ? 'above expected' :
    summary.status === 'below_expected' ? 'below expected' :
    null

  return (
    <div className="bg-[#0c1324] border border-[#1e293b] rounded-lg p-3">
      <div className="flex items-center justify-between mb-2">
        <p className="text-[10px] font-black uppercase tracking-[0.15em] text-[#4a5568]">
          Strength Index
        </p>
        {pctPerWeek !== null && (
          <span className={cn('text-[10px] font-black tabular-nums tracking-tight', trendColor)}>
            {pctPerWeek >= 0 ? '+' : ''}{pctPerWeek.toFixed(2)}%/wk
            {trendLabel && <span className="text-[#4a5568] font-body ml-1.5">· {trendLabel}</span>}
          </span>
        )}
      </div>

      <div className="flex items-end gap-3">
        <div className="flex-1 h-10">
          <Sparkline points={summary.history.map(p => p.index)} />
        </div>
        <div className="text-right shrink-0">
          <p className="text-[18px] font-black text-white tabular-nums leading-none tracking-tighter">
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}<span className="text-xs text-[#4a5568] ml-0.5">%</span>
          </p>
          <p className="text-[8px] font-body text-[#334155] mt-0.5 uppercase tracking-widest">since start</p>
        </div>
      </div>

      <p className="text-[9px] text-[#334155] font-body mt-2">
        Avg across {summary.liftCount} key lift{summary.liftCount === 1 ? '' : 's'}, weekly best e1RM, normalised to phase start.
      </p>
    </div>
  )
}

// ── Sparkline (pure SVG, no client deps) ─────────────────────────────────────

function Sparkline({ points }: { points: number[] }) {
  if (points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const range = max - min || 1

  const path = points.map((v, i) => {
    const x = (i / (points.length - 1)) * 100
    const y = 100 - ((v - min) / range) * 90 - 5  // 5% padding top/bottom
    return `${i === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`
  }).join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
      <path
        d={path}
        fill="none"
        stroke="#CCFF00"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// ── Volume landmark row — bar with zones + marker ────────────────────────────

function VolumeLandmarkRow({ point }: { point: MuscleVolumeLandmarkPoint }) {
  const { muscleGroup, setCount, weeklyFrequency, landmarks, status } = point
  const styles = VOLUME_STATUS_STYLES[status]

  // Scale: from 0 to a bit past MRV so over-MRV sets are visible
  const scaleMax = Math.max(landmarks.mrv * 1.2, setCount * 1.05, 1)
  const pct = (n: number) => Math.min(100, (n / scaleMax) * 100)

  const mvPct      = pct(landmarks.mv)
  const mevPct     = pct(landmarks.mev)
  const mavMinPct  = pct(landmarks.mav.min)
  const mavMaxPct  = pct(landmarks.mav.max)
  const mrvPct     = pct(landmarks.mrv)
  const markerPct  = pct(setCount)

  // Show frequency as whole sessions-per-week, minimum 1 when trained at all.
  // weeklyFrequency = distinct days trained ÷ 4 weeks, so 0.5 = once per 2 wks.
  // We ceil so "trained once in 4 weeks" still shows 1× rather than <1×.
  const freqSessions = weeklyFrequency > 0 ? Math.max(1, Math.round(weeklyFrequency)) : 0
  const freqLabel    = freqSessions > 0 ? `${freqSessions}×/wk` : null
  // Schoenfeld 2016: 2×/wk > 1×/wk for hypertrophy — signal the gap.
  const freqColor    = freqSessions >= 2 ? 'text-[#CCFF00] bg-[#CCFF00]/10' : 'text-yellow-400 bg-yellow-400/10'

  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)} />
          <span className="text-[11px] font-black uppercase tracking-tight text-white truncate">
            {muscleGroup}
          </span>
          {freqLabel && (
            <span className={cn('text-[8px] font-black uppercase tracking-widest px-1 py-0.5 rounded shrink-0', freqColor)}>
              {freqLabel}/wk
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] tabular-nums text-[#adb4ce] font-black">
            {setCount}
            <span className="text-[#334155] font-body ml-1">/ {landmarks.mev}–{landmarks.mav.max}</span>
          </span>
          <span className={cn('text-[8px] font-black uppercase tracking-widest w-[60px] text-right', styles.text)}>
            {styles.label}
          </span>
        </div>
      </div>

      <div className="relative h-1.5 bg-[#0c1324] rounded-full overflow-visible">
        {/* MV → MEV: maintenance band */}
        <div
          className="absolute top-0 h-full bg-orange-400/15 rounded-full"
          style={{ left: `${mvPct}%`, width: `${Math.max(0, mevPct - mvPct)}%` }}
        />
        {/* MEV → MAV.min: sub-optimal */}
        <div
          className="absolute top-0 h-full bg-yellow-400/20"
          style={{ left: `${mevPct}%`, width: `${Math.max(0, mavMinPct - mevPct)}%` }}
        />
        {/* MAV.min → MAV.max: optimal */}
        <div
          className="absolute top-0 h-full bg-[#CCFF00]/30"
          style={{ left: `${mavMinPct}%`, width: `${Math.max(0, mavMaxPct - mavMinPct)}%` }}
        />
        {/* MAV.max → MRV: high */}
        <div
          className="absolute top-0 h-full bg-orange-400/20"
          style={{ left: `${mavMaxPct}%`, width: `${Math.max(0, mrvPct - mavMaxPct)}%` }}
        />
        {/* MRV → end: over-MRV */}
        <div
          className="absolute top-0 h-full bg-red-500/30 rounded-r-full"
          style={{ left: `${mrvPct}%`, right: 0 }}
        />

        {/* Current marker — vertical white tick that pokes above the bar */}
        <div
          className={cn('absolute -top-0.5 bottom-[-2px] w-0.5 rounded-full', styles.dot)}
          style={{ left: `${markerPct}%`, transform: 'translateX(-50%)' }}
        />
      </div>
    </div>
  )
}
