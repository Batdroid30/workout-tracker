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

// Priority for sorting — problems first
const STATUS_PRIORITY: Record<VolumeStatus, number> = {
  over_mrv: 0, below_mv: 1, maintenance: 2, sub_optimal: 3, high: 4, optimal: 5,
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
  below_mv:    '#ef4444',
  over_mrv:    '#ef4444',
  maintenance: '#f97316',
  sub_optimal: '#facc15',
  high:        '#f97316',
  optimal:     '#10b981',
}

// ── Pure tick geometry helper ──────────────────────────────────────────────────

function ringTickCoords(fraction: number) {
  const angleDeg = ARC_ROTATION + fraction * 270
  const rad = (angleDeg * Math.PI) / 180
  return {
    x1: RING_CX + 22 * Math.cos(rad),
    y1: RING_CY + 22 * Math.sin(rad),
    x2: RING_CX + 30 * Math.cos(rad),
    y2: RING_CY + 30 * Math.sin(rad),
  }
}

// ── Shared SVG glow filters ────────────────────────────────────────────────────

function GlowDefs() {
  return (
    <svg width="0" height="0" style={{ position: 'absolute' }} aria-hidden>
      <defs>
        {/* Green glow — for optimal */}
        <filter id="pc-glow-green" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {/* Orange glow — for maintenance / high */}
        <filter id="pc-glow-orange" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {/* Yellow glow — for sub_optimal */}
        <filter id="pc-glow-yellow" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        {/* Red glow — for below_mv / over_mrv */}
        <filter id="pc-glow-red" x="-60%" y="-60%" width="220%" height="220%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="2.5" result="blur"/>
          <feMerge>
            <feMergeNode in="blur"/>
            <feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
      </defs>
    </svg>
  )
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

  const filterId =
    status === 'optimal'                             ? 'pc-glow-green'
    : status === 'high' || status === 'maintenance'  ? 'pc-glow-orange'
    : status === 'sub_optimal'                       ? 'pc-glow-yellow'
    : status === 'below_mv' || status === 'over_mrv' ? 'pc-glow-red'
    : null

  const dashArray = `${fillLen.toFixed(2)} ${(RING_CIRCUMFERENCE - fillLen).toFixed(2)}`
  const trackDash = `${ARC_LENGTH.toFixed(2)} ${(RING_CIRCUMFERENCE - ARC_LENGTH).toFixed(2)}`
  const label = point.muscleGroup.charAt(0).toUpperCase() + point.muscleGroup.slice(1)

  return (
    <div className="flex flex-col items-center gap-1">
      <svg viewBox="0 0 64 64" width="64" height="64" className="overflow-visible">
        {/* Track */}
        <circle
          cx={RING_CX} cy={RING_CY} r={RING_R}
          fill="none"
          stroke="rgba(255,255,255,0.07)"
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
            style={filterId ? { filter: `url(#${filterId})` } : undefined}
          />
        )}
        {/* MEV Tick */}
        <line
          x1={mevTick.x1} y1={mevTick.y1}
          x2={mevTick.x2} y2={mevTick.y2}
          stroke="rgba(255,255,255,0.25)"
          strokeWidth={1.5}
        />
        {/* MAV End Tick */}
        <line
          x1={mavTick.x1} y1={mavTick.y1}
          x2={mavTick.x2} y2={mavTick.y2}
          stroke="rgba(255,255,255,0.45)"
          strokeWidth={1.5}
        />
        {/* Value Label */}
        <text
          x={RING_CX} y={RING_CY + 4}
          textAnchor="middle"
          className="mono font-bold tabular-nums"
          fill="var(--text-hi)"
          fontSize="15px"
        >
          {setCount}
        </text>
      </svg>
      <span className="text-[9px] font-semibold text-[var(--text-mid)] truncate max-w-[56px]" title={label}>
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
      <GlowDefs />
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

  // ── Calculate Nutrition Targets ──
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
        <div className="glass p-4 flex flex-col justify-between min-h-[150px] w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="t-label">Mesocycle Progress</span>
            {phaseLabel && (
              <span className="text-[10px] font-bold text-[var(--accent)] uppercase tracking-wider bg-[var(--accent-soft)] px-2 py-0.5 rounded-md border border-[var(--accent-line)]">
                {phaseLabel}
              </span>
            )}
          </div>
          <div className="my-auto">
            {mesocycle ? (
              <MesocycleTimeline mesocycle={mesocycle} compact />
            ) : (
              <p className="text-xs text-[var(--text-low)] leading-relaxed">
                No active mesocycle. Complete your training profile setup to initialize tracking.
              </p>
            )}
          </div>
          <div className="text-[8px] text-[var(--text-faint)] flex justify-between mt-2 pt-1 border-t border-white/[0.02]">
            <span>Cycle limit: {cycleLength ?? '?'} wks</span>
            <span>Week {weeksInPhase ?? '?'} active</span>
          </div>
        </div>

        {/* CARD 2: STRENGTH INDEX */}
        <div className="glass p-4 flex flex-col justify-between min-h-[150px] w-full">
          <StrengthIndexSection summary={strengthIndex} />
        </div>

        {/* CARD 3: VOLUME LANDMARKS */}
        <div className="glass p-4 flex flex-col justify-between min-h-[150px] w-full">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="t-label">Volume Rings</span>
              <div className="flex items-center gap-2 text-[8px] text-[var(--text-faint)] uppercase tracking-widest">
                <span>MEV | MAV</span>
              </div>
            </div>
            <VolumeRingGrid points={sortedLandmarks} />
          </div>
          <div className="text-[8px] text-[var(--text-faint)] mt-2 pt-1 border-t border-white/[0.02] leading-relaxed flex items-center justify-between">
            <span>Gauging set counts vs targets</span>
            <span className="text-[var(--accent)] font-semibold">All groups</span>
          </div>
        </div>

        {/* CARD 4: NUTRITION TARGETS */}
        <div className="glass p-4 flex flex-col justify-between min-h-[150px] w-full">
          <div className="flex items-center justify-between mb-2">
            <span className="t-label">Nutrition Targets</span>
            <Flame className="w-3.5 h-3.5" style={{ color: 'var(--rose)' }} />
          </div>
          
          {!hasNutritionStats ? (
            <div className="my-auto">
              <p className="text-[11px] text-[var(--text-low)] leading-relaxed">
                Add height, age, and sex in{' '}
                <Link href="/profile" className="underline font-semibold" style={{ color: 'var(--accent)' }}>
                  your profile
                </Link>{' '}
                to calculate custom calorie & protein targets.
              </p>
            </div>
          ) : !targets ? (
            <div className="my-auto">
              <p className="text-[11px] text-[var(--text-low)] leading-relaxed">
                Unable to estimate targets. Check that your height, age, and weight are correct.
              </p>
            </div>
          ) : (
            <div className="flex flex-col justify-between h-full pt-1">
              <div>
                <p className="text-[9px] uppercase tracking-wider text-[var(--text-faint)] mb-2">
                  {nutPhaseLabel} Phase · {latestWeight}kg
                </p>
                <div className="grid grid-cols-2 gap-2 mb-2">
                  <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                    <p className="mono text-sm font-bold text-[var(--text-hi)]">
                      {targets.targetCalories.toLocaleString()}
                    </p>
                    <p className="text-[8px] text-[var(--text-faint)] uppercase">kcal/day</p>
                  </div>
                  <div className="p-1.5 rounded-lg bg-white/[0.02] border border-white/[0.04] text-center">
                    <p className="mono text-sm font-bold text-[var(--text-hi)]">
                      {targets.proteinGrams}g
                    </p>
                    <p className="text-[8px] text-[var(--text-faint)] uppercase">protein/day</p>
                  </div>
                </div>
              </div>
              <p className="text-[8.5px] text-[var(--text-faint)] leading-normal pt-1 border-t border-white/[0.02]">
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
        <div className="glass p-4 space-y-4">
          {topImproved && (
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="t-label mb-1">Most Improved Lift</p>
                <p className="text-[13px] font-semibold truncate text-[var(--text-hi)]">
                  {topImproved.exerciseName}
                </p>
                <p className="mono text-[10px] mt-0.5 tabular-nums text-[var(--text-low)]">
                  {topImproved.previousBest.toFixed(1)} → {topImproved.recentBest.toFixed(1)} kg e1RM
                </p>
              </div>
              <div
                className="flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 rounded-xl bg-[var(--accent-soft)] border border-[var(--accent-line)] shadow-[0_0_16px_var(--accent-glow)]"
              >
                <TrendingUp className="w-3.5 h-3.5 text-[var(--accent)]" />
                <span
                  className="mono text-lg font-bold tabular-nums text-[var(--accent)]"
                  style={{ textShadow: '0 0 12px var(--accent-glow)' }}
                >
                  +{topImproved.improvementPct}%
                </span>
              </div>
            </div>
          )}
          <div className="flex items-start gap-2 pt-3 border-t border-white/[0.04]">
            <Info className="w-3 h-3 text-[var(--text-faint)] shrink-0 mt-0.5" />
            <p className="text-[9.5px] text-[var(--text-faint)] leading-normal">
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
          <p className="t-label mb-1.5">Strength Index</p>
          <p className="text-[10.5px] text-[var(--text-low)] leading-relaxed">
            {summary.liftCount < 3
              ? 'Train 3+ compound lifts to unlock your Strength Index tracker.'
              : 'Log a few more weeks of training to start calculating your index.'}
          </p>
        </div>
        <p className="text-[8px] text-[var(--text-faint)] mt-2">
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
    summary.status === 'on_track'       ? 'var(--accent)' :
    summary.status === 'above_expected' ? 'var(--teal)'   :
    summary.status === 'below_expected' ? '#f97316'       :
    'var(--text-mid)'

  const TrendIcon = pctPerWeek === null ? Minus : isPositive ? TrendingUp : TrendingDown

  return (
    <div className="flex flex-col justify-between h-full w-full">
      <div className="flex items-start justify-between">
        <div>
          <p className="t-label">Strength Index</p>
          <p className="text-[8px] mt-0.5 text-[var(--text-faint)]">
            {summary.liftCount} lifts · from phase start
          </p>
        </div>
        <div className="text-right">
          <p
            className="mono font-bold tabular-nums leading-none tracking-tighter text-xl"
            style={{
              color:      trendColor,
              textShadow: `0 0 24px ${trendColor}60`,
            }}
          >
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}%
          </p>
          {pctPerWeek !== null && (
            <div className="flex items-center justify-end gap-0.5 mt-0.5">
              <TrendIcon className="w-2.5 h-2.5" style={{ color: trendColor }} />
              <span className="mono text-[8.5px] tabular-nums" style={{ color: trendColor }}>
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
