import { Compass, Info } from 'lucide-react'
import { IndexLiftChips } from './IndexLiftChips'
import { cn } from '@/lib/utils'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import { formatSetCount } from '@/lib/muscle-sets'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { Chip } from '@/components/ui'
import { MesocycleTimeline } from '@/components/phase-coach/MesocycleTimeline'
import { VOLUME_STATUS_STYLES, STATUS_PRIORITY } from '@/components/progress/volume-status-styles'
import type { Mesocycle } from '@/lib/phase-coach'
import type {
  StrengthIndexSummary,
  MuscleVolumeLandmarkPoint,
  KeyLift,
} from '@/lib/data/phase-coach'
import type { TrainingPhase, ExperienceLevel } from '@/types/database'

// ─── Phase Coach detail section for /progress ────────────────────────────────
//
// The deep-dive equivalent of PhaseCoachCard on the dashboard. Same data
// surface, larger render: full-size Strength Index chart, key-lift pills,
// volume-landmark bars with a legend explaining MV / MEV / MAV / MRV.

interface PhaseCoachDetailProps {
  trainingPhase:    TrainingPhase   | null
  experienceLevel:  ExperienceLevel | null
  weeksInPhase:     number          | null
  strengthIndex:    StrengthIndexSummary
  volumeLandmarks:  MuscleVolumeLandmarkPoint[]
  keyLifts:         KeyLift[]
  liftSource:       'picked' | 'auto'
  mesocycle:        Mesocycle       | null
}

export function PhaseCoachDetail({
  trainingPhase,
  experienceLevel,
  weeksInPhase,
  strengthIndex,
  volumeLandmarks,
  keyLifts,
  liftSource,
  mesocycle,
}: PhaseCoachDetailProps) {
  const phaseLabel  = trainingPhase ? trainingPhase.charAt(0).toUpperCase() + trainingPhase.slice(1) : null
  const cycleLength = (trainingPhase && experienceLevel)
    ? DELOAD_THRESHOLDS[experienceLevel][trainingPhase]
    : null

  const sortedLandmarks = [...volumeLandmarks].sort(
    (a, b) => STATUS_PRIORITY[a.status] - STATUS_PRIORITY[b.status],
  )

  const indexChartData = strengthIndex.history.map(p => ({
    date:  new Date(p.weekStart).toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: Number(((p.index - 1) * 100).toFixed(2)),
  }))

  return (
    <section>
      {/* ── Section header ──────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="t-display-s">Phase Coach</h2>
        {phaseLabel && (
          <Chip>
            {phaseLabel}
            {weeksInPhase ? ` · Wk ${weeksInPhase}` : ''}
          </Chip>
        )}
      </div>

      {/* ── Mesocycle timeline (full) ───────────────────────────────── */}
      {mesocycle && (
        <div className="card p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="t-label">
              Mesocycle · Wk {mesocycle.currentWeek} / {mesocycle.totalWeeks}
            </h3>
            <p className="t-caption">sessions / week</p>
          </div>
          <MesocycleTimeline mesocycle={mesocycle} />
          <p className="t-caption mt-3 leading-relaxed">
            Cycle length follows your experience and phase. Deload week is recommended —
            the Deload card on the dashboard will fire earlier if your fatigue signals spike.
          </p>
        </div>
      )}

      {/* ── Strength Index full chart ──────────────────────────────── */}
      <div className="card p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-3.5 h-3.5 text-secondary" />
          <h3 className="t-label">Strength index</h3>
        </div>

        <StrengthIndexBlock summary={strengthIndex} chartData={indexChartData} />

        <IndexLiftChips lifts={keyLifts} source={liftSource} />
      </div>

      {/* ── Volume Landmarks ───────────────────────────────────────── */}
      <div className="card p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="t-label">Volume landmarks · this week</h3>
          <p className="t-caption">sets / week</p>
        </div>

        <VolumeLegend />

        <div className="space-y-2.5 mt-3">
          {sortedLandmarks.map(point => (
            <VolumeLandmarkRow key={point.muscleGroup} point={point} />
          ))}
        </div>

        <p className="t-caption mt-3 leading-relaxed">
          Bands shift with your phase and style. Cuts shrink the recoverable
          ceiling; bulks raise it.
        </p>
      </div>

      {/* ── Honesty footer ─────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-1">
        <Info className="w-3 h-3 shrink-0 mt-0.5 text-tertiary" />
        <p className="t-caption leading-relaxed">
          Strength gain is a <span className="text-secondary font-semibold">proxy</span> for muscle gain, not a direct measure.
          Track bodyweight and progress photos alongside it for the complete picture.
        </p>
      </div>
    </section>
  )
}

// ── Strength Index block — full chart + headline numbers ────────────────────

interface StrengthIndexBlockProps {
  summary:   StrengthIndexSummary
  chartData: { date: string; value: number }[]
}

function StrengthIndexBlock({ summary, chartData }: StrengthIndexBlockProps) {
  if (summary.history.length < 3) {
    return (
      <p className="t-caption leading-relaxed mt-2">
        {summary.liftCount < 3
          ? 'Train at least 3 different compound lifts so we can normalise an Index across them.'
          : 'Log a few weeks of compound lifts to start tracking your Index since phase start.'}
      </p>
    )
  }

  const last     = summary.history[summary.history.length - 1].index
  const first    = summary.history[0].index
  const totalPct = ((last - first) / first) * 100
  const pctPerWeek = summary.pctPerWeek

  const trendColor =
    summary.status === 'on_track'       ? 'text-positive' :
    summary.status === 'above_expected' ? 'text-positive' :
    summary.status === 'below_expected' ? 'text-caution' :
    'text-secondary'

  const trendLabel =
    summary.status === 'on_track'       ? 'On track for your level' :
    summary.status === 'above_expected' ? 'Above expected — strong progress' :
    summary.status === 'below_expected' ? 'Below expected — review recovery / nutrition' :
    null

  return (
    <div>
      {/* Headline numbers */}
      <div className="flex items-end justify-between mt-1 mb-3">
        <div>
          <p className="mono text-3xl tabular-nums tracking-tighter text-primary">
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}
            <span className="text-base ml-0.5 text-tertiary">%</span>
          </p>
          <p className="t-label mt-0.5">Since phase start</p>
        </div>
        {pctPerWeek !== null && (
          <div className="text-right">
            <p className={cn('mono text-xl tabular-nums tracking-tight', trendColor)}>
              {pctPerWeek >= 0 ? '+' : ''}{pctPerWeek.toFixed(2)}%
            </p>
            <p className="t-label mt-0.5">per week</p>
          </div>
        )}
      </div>

      {/* Full chart */}
      <div className="h-[180px] w-full">
        <ProgressionLineChart data={chartData} color="var(--data-1)" formatType="number" />
      </div>

      {trendLabel && (
        <p className={cn('t-caption font-semibold mt-2 text-center', trendColor)}>
          {trendLabel}
        </p>
      )}

      <p className="t-caption mt-2 text-center">
        Avg of weekly best e1RM across {summary.liftCount} key lift{summary.liftCount === 1 ? '' : 's'}, normalised to phase start.
      </p>
    </div>
  )
}

// ── Legend explaining the bands ─────────────────────────────────────────────

function VolumeLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs p-3.5 bg-bg rounded-xl border border-border text-tertiary">
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded border ${VOLUME_STATUS_STYLES.maintenance.zone} ${VOLUME_STATUS_STYLES.maintenance.zoneBorder}`} />
        <span>MV – MEV <span className="ml-0.5 opacity-60">(Maintain)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded border ${VOLUME_STATUS_STYLES.sub_optimal.zone} ${VOLUME_STATUS_STYLES.sub_optimal.zoneBorder}`} />
        <span>MEV – MAV <span className="ml-0.5 opacity-60">(Growing)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded border ${VOLUME_STATUS_STYLES.optimal.zone} ${VOLUME_STATUS_STYLES.optimal.zoneBorder}`} />
        <span className="font-semibold text-positive">MAV <span className="ml-0.5 opacity-65">(Optimal)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded border ${VOLUME_STATUS_STYLES.high.zone} ${VOLUME_STATUS_STYLES.high.zoneBorder}`} />
        <span>MAV – MRV <span className="ml-0.5 opacity-60">(High)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`w-2 h-2 rounded border ${VOLUME_STATUS_STYLES.over_mrv.zone} ${VOLUME_STATUS_STYLES.over_mrv.zoneBorder}`} />
        <span>Over MRV <span className="ml-0.5 opacity-60">(Fatiguing)</span></span>
      </span>
    </div>
  )
}

// ── Volume landmark row — same visual as dashboard, larger spacing ──────────

function VolumeLandmarkRow({ point }: { point: MuscleVolumeLandmarkPoint }) {
  const { muscleGroup, setCount, weeklyFrequency, landmarks, status } = point
  const styles = VOLUME_STATUS_STYLES[status]

  const scaleMax = Math.max(landmarks.mrv * 1.25, setCount * 1.08, 1)
  const pct = (n: number) => Math.min(100, (n / scaleMax) * 100)

  const mvPct     = pct(landmarks.mv)
  const mevPct    = pct(landmarks.mev)
  const mavMinPct = pct(landmarks.mav.min)
  const mavMaxPct = pct(landmarks.mav.max)
  const mrvPct    = pct(landmarks.mrv)
  const markerPct = pct(setCount)

  const freqSessions = weeklyFrequency > 0 ? Math.max(1, Math.round(weeklyFrequency)) : 0
  const freqLabel    = freqSessions > 0 ? `${freqSessions}×/wk` : null
  const freqStyle    = freqSessions >= 2
    ? 'bg-positive-soft text-positive'
    : 'bg-caution-soft text-caution'

  return (
    <div className="bg-surface-raised p-3.5 rounded-control border border-border hover:border-border-strong transition-colors duration-300 group">
      {/* Header Info */}
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0 animate-pulse', styles.dot)} />
          <span className="text-xs font-bold capitalize truncate text-primary">
            {muscleGroup}
          </span>
          {freqLabel && (
            <span
              className={cn(
                "text-xs font-bold px-1.5 py-0.5 rounded shrink-0",
                freqStyle
              )}
            >
              {freqLabel}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-xs tabular-nums font-semibold text-primary">
            {formatSetCount(setCount)} <span className="text-xs font-normal text-tertiary">sets</span>
          </span>
          <span
            className={cn(
              "text-xs font-bold px-2 py-0.5 rounded-full shrink-0",
              styles.bg,
              styles.text
            )}
          >
            {styles.label}
          </span>
        </div>
      </div>

      {/* Bar visual */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-bg border border-border">
        {/* Shaded Landmark Zones */}
        <div className={`absolute top-0 h-full ${VOLUME_STATUS_STYLES.maintenance.zone}`}
             style={{ left: `${mvPct}%`, width: `${Math.max(0, mevPct - mvPct)}%` }} />
        <div className={`absolute top-0 h-full ${VOLUME_STATUS_STYLES.sub_optimal.zone}`}
             style={{ left: `${mevPct}%`, width: `${Math.max(0, mavMinPct - mevPct)}%` }} />
        <div className={`absolute top-0 h-full ${VOLUME_STATUS_STYLES.optimal.zone}`}
             style={{ left: `${mavMinPct}%`, width: `${Math.max(0, mavMaxPct - mavMinPct)}%` }} />
        <div className={`absolute top-0 h-full ${VOLUME_STATUS_STYLES.high.zone}`}
             style={{ left: `${mavMaxPct}%`, width: `${Math.max(0, mrvPct - mavMaxPct)}%` }} />
        <div className={`absolute top-0 h-full ${VOLUME_STATUS_STYLES.over_mrv.zone}`}
             style={{ left: `${mrvPct}%`, right: 0 }} />

        {/* Zone Ticks/Dividers */}
        {[mvPct, mevPct, mavMinPct, mavMaxPct, mrvPct].map((p, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 w-[1px] bg-border-strong z-10"
            style={{ left: `${p}%` }}
          />
        ))}

        {/* User sets progress fill */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full rounded-l-full transition-all duration-500 ease-out",
            styles.bar
          )}
          style={{ width: `${markerPct}%` }}
        />

        {/* Cursor thumb */}
        <div
          className="absolute -top-0.5 bottom-[-2px] w-1 h-[14px] rounded-full bg-primary transition-all duration-500 ease-out"
          style={{ left: `${markerPct}%`, transform: 'translateX(-50%)' }}
        />
      </div>

      {/* Threshold Row */}
      <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 mt-2.5 px-0.5 text-xs font-medium text-tertiary">
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-caution/40" />
            <span>MV <strong className="text-secondary">{landmarks.mv}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-caution/40" />
            <span>MEV <strong className="text-secondary">{landmarks.mev}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-positive/40" />
            <span>MAV <strong className="text-secondary">{landmarks.mav.min}-{landmarks.mav.max}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-negative/40" />
            <span>MRV <strong className="text-secondary">{landmarks.mrv}</strong></span>
          </span>
        </div>
        
        <span className="text-xs font-semibold text-secondary">
          {status === 'below_mv' && `+${formatSetCount(landmarks.mv - setCount)} to MV`}
          {status === 'maintenance' && `+${formatSetCount(landmarks.mev - setCount)} to MEV`}
          {status === 'sub_optimal' && `+${formatSetCount(landmarks.mav.min - setCount)} to MAV`}
          {status === 'optimal' && `Optimal range`}
          {status === 'high' && `+${formatSetCount(landmarks.mrv - setCount)} to MRV`}
          {status === 'over_mrv' && `${formatSetCount(setCount - landmarks.mrv)} over MRV`}
        </span>
      </div>
    </div>
  )
}
