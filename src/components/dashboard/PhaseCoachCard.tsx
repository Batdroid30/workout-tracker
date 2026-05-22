import { Compass, TrendingUp, Info, TrendingDown, Minus } from 'lucide-react'
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
  // Filter IDs are unique per component tree instance. The dashboard renders
  // PhaseCoachCard once so collisions are not a risk in production.
  // feMerge: blur node first (behind), SourceGraphic node second (on top) —
  // this is the correct Porter-Duff order for a neon glow effect.
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

  // Gap = circumference - fill so SVG doesn't repeat the dash pattern unexpectedly
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
            filter={filterId ? `url(#${filterId})` : undefined}
          />
        )}
        {/* MEV tick — dimmed when no sets logged so it reads as a target, not an achievement */}
        <line
          x1={mevTick.x1.toFixed(2)} y1={mevTick.y1.toFixed(2)}
          x2={mevTick.x2.toFixed(2)} y2={mevTick.y2.toFixed(2)}
          stroke="rgba(255,255,255,0.25)" strokeWidth="1.5" strokeLinecap="round"
          opacity={setCount === 0 ? 0.4 : 1}
        />
        {/* MAV tick */}
        <line
          x1={mavTick.x1.toFixed(2)} y1={mavTick.y1.toFixed(2)}
          x2={mavTick.x2.toFixed(2)} y2={mavTick.y2.toFixed(2)}
          stroke="rgba(255,255,255,0.45)" strokeWidth="1.5" strokeLinecap="round"
          opacity={setCount === 0 ? 0.4 : 1}
        />
        {/* Set count */}
        <text
          x={RING_CX} y={RING_CY + 1}
          textAnchor="middle" dominantBaseline="middle"
          fontSize="13" fontWeight="600" fontFamily="monospace"
          fill={setCount > 0 ? color : 'rgba(255,255,255,0.2)'}
        >
          {setCount}
        </text>
      </svg>
      {/* Muscle name */}
      <span
        className="text-[9px] text-center leading-tight max-w-[60px] truncate"
        style={{ color: setCount > 0 ? 'var(--text-mid)' : 'var(--text-faint)' }}
      >
        {label}
      </span>
    </div>
  )
}

// ── Volume ring grid ───────────────────────────────────────────────────────────

function VolumeRingGrid({ points }: { points: MuscleVolumeLandmarkPoint[] }) {
  return (
    <div>
      <GlowDefs />
      <div className="grid grid-cols-4 gap-x-1 gap-y-3">
        {points.map(point => (
          <MuscleRingCell key={point.muscleGroup} point={point} />
        ))}
      </div>
    </div>
  )
}

// ── Main card ─────────────────────────────────────────────────────────────────

export function PhaseCoachCard({
  trainingPhase,
  experienceLevel,
  weeksInPhase,
  strengthIndex,
  volumeLandmarks,
  mostImproved,
  mesocycle,
}: PhaseCoachCardProps) {
  const phaseLabel  = trainingPhase ? trainingPhase.charAt(0).toUpperCase() + trainingPhase.slice(1) : null
  const cycleLength = (trainingPhase && experienceLevel)
    ? DELOAD_THRESHOLDS[experienceLevel][trainingPhase]
    : null

  const sortedLandmarks = [...volumeLandmarks].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
  )

  const topImproved = mostImproved[0] ?? null

  return (
    <div className="glass p-4 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Compass className="w-3.5 h-3.5 text-[var(--accent)]" />
          <h3 className="t-label">Phase Coach</h3>
        </div>
        {phaseLabel && (
          <div className="flex items-center gap-1.5">
            <span className="t-label text-[var(--accent)]">{phaseLabel}</span>
            {weeksInPhase && cycleLength && (
              <span className="text-[10px] text-[var(--text-faint)] mono tabular-nums">
                wk {Math.min(weeksInPhase, cycleLength)}/{cycleLength}
              </span>
            )}
          </div>
        )}
      </div>

      {/* ── Mesocycle timeline ──────────────────────────────────────────────── */}
      {mesocycle && <MesocycleTimeline mesocycle={mesocycle} compact />}

      {/* ── Strength index ──────────────────────────────────────────────────── */}
      <StrengthIndexSection summary={strengthIndex} />

      {/* ── Volume landmarks ────────────────────────────────────────────────── */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <p className="t-label">Volume · This Week</p>
          <div className="flex items-center gap-3 text-[9px] text-[var(--text-faint)] uppercase tracking-widest">
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-px h-3 bg-white/25 rounded-full" />
              MEV
            </span>
            <span className="flex items-center gap-1.5">
              <span className="inline-block w-px h-3 bg-white/45 rounded-full" />
              MAV
            </span>
          </div>
        </div>
        <VolumeRingGrid points={sortedLandmarks} />
      </div>

      {/* ── Most improved ───────────────────────────────────────────────────── */}
      {topImproved && (
        <div
          className="flex items-center justify-between gap-3 pt-4"
          style={{ borderTop: '1px solid rgba(255,255,255,0.05)' }}
        >
          <div className="min-w-0">
            <p className="t-label mb-1">Most Improved</p>
            <p className="text-[13px] font-semibold truncate" style={{ color: 'var(--text-hi)' }}>
              {topImproved.exerciseName}
            </p>
            <p className="mono text-[10px] mt-0.5 tabular-nums" style={{ color: 'var(--text-low)' }}>
              {topImproved.previousBest.toFixed(1)} → {topImproved.recentBest.toFixed(1)} kg e1RM
            </p>
          </div>
          <div
            className="flex items-center gap-1.5 shrink-0 px-3.5 py-2.5 rounded-xl"
            style={{
              background: 'var(--accent-soft)',
              border:     '1px solid var(--accent-line)',
              boxShadow:  '0 0 16px var(--accent-glow)',
            }}
          >
            <TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            <span
              className="mono text-lg font-bold tabular-nums"
              style={{ color: 'var(--accent)', textShadow: '0 0 12px var(--accent-glow)' }}
            >
              +{topImproved.improvementPct}%
            </span>
          </div>
        </div>
      )}

      {/* ── Disclaimer ──────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-2 pt-1">
        <Info className="w-3 h-3 text-[var(--text-faint)] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[var(--text-faint)] leading-relaxed">
          Strength gain is a proxy for muscle gain. Also track bodyweight and photos.
        </p>
      </div>
    </div>
  )
}

// ── Strength Index ─────────────────────────────────────────────────────────────

function StrengthIndexSection({ summary }: { summary: StrengthIndexSummary }) {
  if (summary.history.length < 3) {
    return (
      <div className="rounded-2xl p-3.5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)' }}>
        <p className="t-label mb-1">Strength Index</p>
        <p className="text-[11px] text-[var(--text-low)] leading-relaxed">
          {summary.liftCount < 3
            ? 'Train 3+ compound lifts to unlock your Strength Index.'
            : 'Log a few more weeks to start tracking your Index.'}
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
    <div
      className="rounded-2xl p-4"
      style={{
        background: 'rgba(255,255,255,0.02)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start justify-between mb-1">
        <div>
          <p className="t-label">Strength Index</p>
          <p className="text-[9px] mt-0.5" style={{ color: 'var(--text-faint)' }}>
            {summary.liftCount} lift{summary.liftCount === 1 ? '' : 's'} · from phase start
          </p>
        </div>
        <div className="text-right">
          <p
            className="mono font-bold tabular-nums leading-none tracking-tighter"
            style={{
              fontSize:   '2rem',
              color:      trendColor,
              textShadow: `0 0 32px ${trendColor}80`,
            }}
          >
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}
            <span className="text-base font-normal ml-0.5" style={{ color: 'var(--text-faint)', textShadow: 'none' }}>%</span>
          </p>
          {pctPerWeek !== null && (
            <div className="flex items-center justify-end gap-1 mt-1">
              <TrendIcon className="w-3 h-3" style={{ color: trendColor }} />
              <span className="mono text-[10px] tabular-nums" style={{ color: trendColor }}>
                {isPositive ? '+' : ''}{pctPerWeek.toFixed(2)}%/wk
              </span>
            </div>
          )}
        </div>
      </div>
      <div className="h-14 mt-2">
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

  // Area fill path
  const area = [
    `M ${pts[0].x.toFixed(2)} 100`,
    ...pts.map(p => `L ${p.x.toFixed(2)} ${p.y.toFixed(2)}`),
    `L ${pts[pts.length - 1].x.toFixed(2)} 100`,
    'Z',
  ].join(' ')

  return (
    <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
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
