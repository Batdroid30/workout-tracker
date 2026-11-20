import { Compass, TrendingUp, Info, TrendingDown, Minus, Flame, Award } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import type { VolumeStatus, Mesocycle } from '@/lib/phase-coach'
import type { StrengthIndexSummary, MuscleVolumeLandmarkPoint } from '@/lib/data/phase-coach'
import type { ImprovedExercise } from '@/lib/data/insights'
import type { TrainingPhase, ExperienceLevel, Profile } from '@/types/database'
import type { BodyweightPoint } from '@/lib/data/bodyweight'
import { MesocycleTimeline } from '@/components/phase-coach/MesocycleTimeline'
import { calculateNutritionTargets } from '@/lib/algorithms'
import Link from 'next/link'
import { formatSetCount } from '@/lib/muscle-sets'
import { STATUS_PRIORITY } from '@/components/progress/volume-status-styles'

interface PhaseCoachCardProps {
  trainingPhase:   TrainingPhase   | null
  experienceLevel: ExperienceLevel | null
  weeksInPhase:    number          | null
  strengthIndex:   StrengthIndexSummary
  volumeLandmarks: MuscleVolumeLandmarkPoint[]
  mostImproved:    ImprovedExercise[]
  mesocycle:       Mesocycle       | null
  profile:         Profile         | null
  bwHistory:       BodyweightPoint[]
  weeklyGoal:      number
}

// ── Arc ring geometry constants ────────────────────────────────────────────────

const RING_CX = 32
const RING_CY = 32
const RING_R  = 26
const RING_STROKE = 4
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_R   // ≈ 163.363
const ARC_FRACTION = 270 / 360                     // 0.75
const ARC_LENGTH = RING_CIRCUMFERENCE * ARC_FRACTION  // ≈ 122.522
const ARC_ROTATION = 135  // degrees — rotates circle so gap is at bottom

const STATUS_COLOR: Record<VolumeStatus, string> = {
  below_mv:    'var(--negative)',
  over_mrv:    'var(--negative)',
  maintenance: 'var(--caution)',
  sub_optimal: 'var(--caution)',
  high:        'var(--caution)',
  optimal:     'var(--positive)',
}

// ── Pure tick geometry helper ──────────────────────────────────────────────────

function ringTickCoords(fraction: number) {
  const angleDeg = ARC_ROTATION + fraction * 270
  const rad = (angleDeg * Math.PI) / 180
  // Round to 3 decimal places: server (Node) and browser JS engines can produce
  // slightly different last-digit results for sin/cos, causing hydration mismatches.
  const r = (n: number) => Math.round(n * 1000) / 1000
  return {
    x1: r(RING_CX + 22 * Math.cos(rad)),
    y1: r(RING_CY + 22 * Math.sin(rad)),
    x2: r(RING_CX + 30 * Math.cos(rad)),
    y2: r(RING_CY + 30 * Math.sin(rad)),
  }
}

// ── Individual muscle ring cell ────────────────────────────────────────────────

function MuscleRingCell({ point }: { point: MuscleVolumeLandmarkPoint }) {
  const { setCount, landmarks, status } = point

  const fillLen = Math.min(ARC_LENGTH, (setCount / Math.max(landmarks.mrv, 1)) * ARC_LENGTH)
  const color   = STATUS_COLOR[status]

  const mevFraction = Math.min(1, landmarks.mev / Math.max(landmarks.mrv, 1))
  const mavFraction = Math.min(1, landmarks.mav.max / Math.max(landmarks.mrv, 1))
  const mevTick     = ringTickCoords(mevFraction)
  const mavTick     = ringTickCoords(mavFraction)

  const dashArray = `${fillLen.toFixed(2)} ${(RING_CIRCUMFERENCE - fillLen).toFixed(2)}`
  const trackDash = `${ARC_LENGTH.toFixed(2)} ${(RING_CIRCUMFERENCE - ARC_LENGTH).toFixed(2)}`
  const label = point.muscleGroup.charAt(0).toUpperCase() + point.muscleGroup.slice(1)

  return (
    <div className="flex flex-col items-center gap-1 min-w-0">
      <svg viewBox="0 0 64 64" width="64" height="64" className="overflow-visible">
        {/* Track */}
        <circle
          cx={RING_CX} cy={RING_CY} r={RING_R}
          fill="none"
          stroke="var(--border-strong)"
          strokeWidth={RING_STROKE}
          strokeDasharray={trackDash}
          transform={`rotate(${ARC_ROTATION} ${RING_CX} ${RING_CY})`}
          strokeLinecap="round"
        />
        {/* Fill */}
        {setCount > 0 && (
          <circle
            cx={RING_CX} cy={RING_CY} r={RING_R}
            fill="none"
            stroke={color}
            strokeWidth={RING_STROKE}
            strokeDasharray={dashArray}
            transform={`rotate(${ARC_ROTATION} ${RING_CX} ${RING_CY})`}
            strokeLinecap="round"
          />
        )}
        {/* MEV Tick */}
        <line
          x1={mevTick.x1} y1={mevTick.y1}
          x2={mevTick.x2} y2={mevTick.y2}
          stroke="var(--text-tertiary)"
          strokeWidth={1.5}
        />
        {/* MAV End Tick */}
        <line
          x1={mavTick.x1} y1={mavTick.y1}
          x2={mavTick.x2} y2={mavTick.y2}
          stroke="var(--text-secondary)"
          strokeWidth={1.5}
        />
        {/* Value Label */}
        <text
          x={RING_CX} y={RING_CY + 4}
          textAnchor="middle"
          className="mono font-bold tabular-nums"
          fill="var(--text-primary)"
          fontSize="15px"
        >
          {formatSetCount(setCount)}
        </text>
      </svg>
      <span className="text-xs font-semibold text-secondary truncate max-w-full" title={label}>
        {label}
      </span>
    </div>
  )
}

function VolumeRingGrid({ points }: { points: MuscleVolumeLandmarkPoint[] }) {
  const visible = points
  if (visible.length === 0) return null

  return (
    <div>
      <div className="grid grid-cols-4 gap-x-2 gap-y-4">
        {visible.map(p => (
          <MuscleRingCell key={p.muscleGroup} point={p} />
        ))}
      </div>
    </div>
  )
}

export function PhaseCoachCard({
  trainingPhase,
  experienceLevel,
  weeksInPhase,
  strengthIndex,
  volumeLandmarks,
  mostImproved,
  mesocycle,
  profile,
  bwHistory,
  weeklyGoal,
}: PhaseCoachCardProps) {
  const phaseLabel  = trainingPhase ? trainingPhase.charAt(0).toUpperCase() + trainingPhase.slice(1) : null
  const cycleLength = (trainingPhase && experienceLevel)
    ? DELOAD_THRESHOLDS[experienceLevel][trainingPhase]
    : null

  const sortedLandmarks = [...volumeLandmarks].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
  )

  const topImproved = mostImproved[0] ?? null

  // ── Calculate Nutrition targets ──
  const latestWeight = bwHistory[0]?.weight_kg ?? null
  const height = profile?.height_cm
  const age = profile?.age_years
  const sex = profile?.sex
  const hasNutritionStats = !!(height && age && sex && latestWeight !== null)

  const targets = (hasNutritionStats && height && age && sex && latestWeight !== null)
    ? calculateNutritionTargets({
        weightKg:           latestWeight,
        heightCm:           height,
        ageYears:           age,
        sex:                sex as 'male' | 'female',
        weeklyGoalSessions: weeklyGoal,
        trainingPhase:      profile?.training_phase ?? null,
      })
    : null

  const nutPhaseLabel =
    profile?.training_phase === 'bulking'  ? 'Bulk'     :
    profile?.training_phase === 'cutting'  ? 'Cut'      : 'Maingain'

  const surplusLabel = targets
    ? (targets.surplusDeficit > 0 ? `+${targets.surplusDeficit} surplus` :
       targets.surplusDeficit < 0 ? `${targets.surplusDeficit} deficit`  : 'maintenance')
    : ''

  return (
    <div className="space-y-4">
      {/* ── Vertical Stacking ── */}
      <div className="flex flex-col gap-4">
        
        {/* CARD 1: MESOCYCLE TIMELINE */}
        <div className="card p-4 flex flex-col justify-between min-h-[150px] w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="t-label">Mesocycle progress</span>
            {phaseLabel && (
              <span className="text-xs font-bold text-primary bg-surface-raised px-2 py-0.5 rounded-md border border-border-strong">
                {phaseLabel}
              </span>
            )}
          </div>
          <div className="my-auto">
            {mesocycle ? (
              <MesocycleTimeline mesocycle={mesocycle} compact />
            ) : (
              <p className="text-xs text-tertiary leading-relaxed">
                No active mesocycle. Complete your training profile setup to initialize tracking.
              </p>
            )}
          </div>
          <div className="text-xs text-tertiary flex justify-between mt-2 pt-1 border-t border-border">
            <span>Cycle limit: {cycleLength ?? '?'} wks</span>
            <span>Week {weeksInPhase ?? '?'} active</span>
          </div>
        </div>

        {/* CARD 2: STRENGTH INDEX */}
        <div className="card p-4 flex flex-col justify-between min-h-[150px] w-full">
          <StrengthIndexSection summary={strengthIndex} />
        </div>

        {/* CARD 3: VOLUME LANDMARKS */}
        <div className="card p-4 flex flex-col justify-between min-h-[150px] w-full">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="t-label">Volume rings</span>
              <div className="flex items-center gap-2 text-xs text-tertiary">
                <span>MEV | MAV</span>
              </div>
            </div>
            <VolumeRingGrid points={sortedLandmarks} />
          </div>
          <div className="text-xs text-tertiary mt-2 pt-1 border-t border-border leading-relaxed flex items-center justify-between">
            <span>Gauging set counts vs targets</span>
            <span className="text-primary font-semibold">All groups</span>
          </div>
        </div>

        {/* CARD 4: NUTRITION TARGETS */}
        <div className="card p-4 flex flex-col justify-between min-h-[150px] w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="t-label">Nutrition targets</span>
            <Flame className="w-3.5 h-3.5 text-caution" />
          </div>
          
          {!hasNutritionStats ? (
            <div className="my-auto">
              <p className="t-caption text-tertiary leading-relaxed">
                Add height, age, and sex in{' '}
                <Link href="/account" className="underline font-semibold text-primary">
                  your profile
                </Link>{' '}
                to calculate custom calorie & protein targets.
              </p>
            </div>
          ) : !targets ? (
            <div className="my-auto">
              <p className="t-caption text-tertiary leading-relaxed">
                Unable to estimate targets. Check that your height, age, and weight are correct.
              </p>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full pt-1">
              <div>
                <p className="text-xs text-tertiary mb-2">
                  {nutPhaseLabel} phase · {latestWeight}kg
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-surface-raised border border-border text-center">
                    <p className="mono text-sm font-bold text-primary">
                      {targets.targetCalories.toLocaleString()}
                    </p>
                    <p className="text-xs text-tertiary">kcal/day</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-surface-raised border border-border text-center">
                    <p className="mono text-sm font-bold text-primary">
                      {targets.proteinGrams}g
                    </p>
                    <p className="text-xs text-tertiary">protein/day</p>
                  </div>
                </div>
              </div>
              <p className="text-xs text-tertiary leading-normal pt-1 border-t border-border">
                {surplusLabel !== 'maintenance'
                  ? `${targets.targetCalories.toLocaleString()} kcal (${surplusLabel}) to support goals.`
                  : `${targets.targetCalories.toLocaleString()} kcal at maintenance TDEE.`}
              </p>
            </div>
          )}
        </div>

      </div>

      {/* ── Most Improved & Disclaimer ── */}
      {(topImproved || true) && (
        <div className="card p-4 space-y-4">
          {topImproved && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="t-label mb-1">Most improved lift</p>
                <p className="t-caption font-semibold truncate text-primary">
                  {topImproved.exerciseName}
                </p>
                <p className="mono text-xs mt-0.5 tabular-nums text-tertiary">
                  {topImproved.previousBest.toFixed(1)} → {topImproved.recentBest.toFixed(1)} kg e1RM
                </p>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 rounded-xl bg-surface-raised border border-border-strong">
                <TrendingUp className="w-3.5 h-3.5 text-primary" />
                <span className="mono text-lg font-bold tabular-nums text-primary">
                  +{topImproved.improvementPct}%
                </span>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 pt-3 border-t border-border">
            <Info className="w-3 h-3 text-tertiary shrink-0 mt-0.5" />
            <p className="text-xs text-tertiary leading-normal">
              Strength gain is a reliable proxy for muscle gain. Track bodyweight logs and photos regularly to monitor progression.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

// ── Strength Index Section ──

function StrengthIndexSection({ summary }: { summary: StrengthIndexSummary }) {
  if (summary.history.length < 3) {
    return (
      <div className="flex flex-col justify-between h-full">
        <div>
          <p className="t-label mb-1.5">Strength index</p>
          <p className="text-xs text-tertiary leading-relaxed">
            {summary.liftCount < 3
              ? 'Train 3+ compound lifts to unlock your Strength index tracker.'
              : 'Log a few more weeks of training to start calculating your index.'}
          </p>
        </div>
        <p className="text-xs text-tertiary mt-2">
          Lifts tracked: {summary.liftCount}
        </p>
      </div>
    )
  }

  const last     = summary.history[summary.history.length - 1].index
  const first    = summary.history[0].index
  const totalPct = ((last - first) / first) * 100
  const pctPerWeek = summary.pctPerWeek

  const isPositive = (pctPerWeek ?? 0) >= 0
  const trendColor =
    summary.status === 'on_track'       ? 'var(--text-primary)' :
    summary.status === 'above_expected' ? 'var(--positive)'     :
    summary.status === 'below_expected' ? 'var(--caution)'      :
    'var(--text-secondary)'

  const TrendIcon = pctPerWeek === null ? Minus : isPositive ? TrendingUp : TrendingDown

  return (
    <div className="flex flex-col justify-between h-full w-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="t-label">Strength index</p>
          <p className="text-xs mt-0.5 text-tertiary">
            {summary.liftCount} lifts · from phase start
          </p>
        </div>
        <div className="text-right">
          <p
            className="mono font-bold tabular-nums leading-none tracking-tighter text-xl"
            style={{ color: trendColor }}
          >
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}%
          </p>
          {pctPerWeek !== null && (
            <div className="flex items-center justify-end gap-0.5 mt-0.5">
              <TrendIcon className="w-2.5 h-2.5" style={{ color: trendColor }} />
              <span className="mono text-xs tabular-nums" style={{ color: trendColor }}>
                {isPositive ? '+' : ''}{pctPerWeek.toFixed(2)}%/wk
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-12 mt-2">
        <Sparkline points={summary.history.map(p => p.index)} color={trendColor} />
      </div>
    </div>
  )
}

function Sparkline({ points, color }: { points: number[]; color: string }) {
  if (points.length < 2) return null
  const min   = Math.min(...points)
  const max   = Math.max(...points)
  const range = max - min || 1

  const pts = points.map((v, i) => ({
    x: (i / (points.length - 1)) * 100,
    y: 100 - ((v - min) / range) * 80 - 10,
  }))

  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`).join(' ')

  const area = [
    `M ${pts[0].x.toFixed(2)} 100`,
    ...pts.map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    `L ${pts[pts.length - 1].x.toFixed(2)} 100`,
    'Z',
  ].join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full overflow-visible">
      <defs>
        <linearGradient id="pc-sparkGrad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.15" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={area} fill="url(#pc-sparkGrad)" />
      <path d={path} fill="none" stroke={color} strokeWidth={2}
        strokeLinecap="round" strokeLinejoin="round" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}
