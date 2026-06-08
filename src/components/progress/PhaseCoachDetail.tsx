import { Compass, Info } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DELOAD_THRESHOLDS } from '@/lib/workout-intelligence'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { MesocycleTimeline } from '@/components/phase-coach/MesocycleTimeline'
import type { VolumeStatus, Mesocycle } from '@/lib/phase-coach'
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
  mesocycle:        Mesocycle       | null
}

// ── Status styling — kept identical to PhaseCoachCard for visual consistency ──

interface VolumeStatusStyle {
  dot: string
  text: string
  label: string
  bg: string
  border: string
  fillGradient: string
  glowColor: string
}

const VOLUME_STATUS_STYLES: Record<VolumeStatus, VolumeStatusStyle> = {
  below_mv: {
    dot: 'bg-red-400',
    text: 'text-red-400',
    label: 'Below MV',
    bg: 'bg-red-500/10',
    border: 'border-red-500/20',
    fillGradient: 'from-red-500/20 to-red-400/80',
    glowColor: 'rgba(239, 68, 68, 0.4)',
  },
  maintenance: {
    dot: 'bg-orange-400',
    text: 'text-orange-400',
    label: 'Maintaining',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    fillGradient: 'from-orange-500/20 to-orange-400/80',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  sub_optimal: {
    dot: 'bg-yellow-400',
    text: 'text-yellow-400',
    label: 'Sub-optimal',
    bg: 'bg-yellow-500/10',
    border: 'border-yellow-500/20',
    fillGradient: 'from-yellow-500/20 to-yellow-400/80',
    glowColor: 'rgba(234, 179, 8, 0.4)',
  },
  optimal: {
    dot: 'bg-emerald-500',
    text: 'text-emerald-400',
    label: 'Optimal',
    bg: 'bg-emerald-500/10',
    border: 'border-emerald-500/30',
    fillGradient: 'from-emerald-600/30 to-emerald-400',
    glowColor: 'rgba(16, 185, 129, 0.5)',
  },
  high: {
    dot: 'bg-orange-400',
    text: 'text-orange-400',
    label: 'High Volume',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    fillGradient: 'from-orange-500/20 to-orange-400/80',
    glowColor: 'rgba(249, 115, 22, 0.4)',
  },
  over_mrv: {
    dot: 'bg-red-500',
    text: 'text-red-500',
    label: 'Over MRV',
    bg: 'bg-red-500/10',
    border: 'border-red-500/30',
    fillGradient: 'from-red-600/30 to-red-500',
    glowColor: 'rgba(239, 68, 68, 0.5)',
  },
}

const STATUS_PRIORITY: Record<VolumeStatus, number> = {
  over_mrv: 0, below_mv: 1, maintenance: 2, sub_optimal: 3, high: 4, optimal: 5,
}

export function PhaseCoachDetail({
  trainingPhase,
  experienceLevel,
  weeksInPhase,
  strengthIndex,
  volumeLandmarks,
  keyLifts,
  mesocycle,
}: PhaseCoachDetailProps) {
  const phaseLabel  = trainingPhase ? trainingPhase.toUpperCase() : null
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
          <span
            className="text-[9px] font-medium uppercase tracking-widest px-2.5 py-1 rounded-lg"
            style={{ background: 'var(--accent-soft)', border: '1px solid var(--accent-line)', color: 'var(--accent)' }}
          >
            {phaseLabel}
            {weeksInPhase ? ` · WK ${weeksInPhase}` : ''}
          </span>
        )}
      </div>

      {/* ── Mesocycle timeline (full) ───────────────────────────────── */}
      {mesocycle && (
        <div className="glass p-4 mb-4">
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
      <div className="glass p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-3.5 h-3.5" style={{ color: 'var(--teal)' }} />
          <h3 className="t-label">Strength Index</h3>
        </div>

        <StrengthIndexBlock summary={strengthIndex} chartData={indexChartData} />

        {/* Tracked lifts */}
        {keyLifts.length > 0 && (
          <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--glass-border)' }}>
            <p className="t-label mb-2">Tracked lifts ({keyLifts.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {keyLifts.map(lift => (
                <span
                  key={lift.exerciseId}
                  className="text-[10px] font-medium uppercase tracking-tight rounded px-2 py-1"
                  style={{ color: 'var(--text-mid)', background: 'var(--bg-1)', border: '1px solid var(--glass-border)' }}
                  title={`${lift.sessionCount} sessions in last 12 weeks`}
                >
                  {lift.exerciseName}
                </span>
              ))}
            </div>
            <p className="t-caption mt-2">
              Auto-detected from your most-frequent compound lifts in the last 12 weeks.
            </p>
          </div>
        )}
      </div>

      {/* ── Volume Landmarks ───────────────────────────────────────── */}
      <div className="glass p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="t-label">Volume Landmarks · This Week</h3>
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
        <Info className="w-3 h-3 shrink-0 mt-0.5" style={{ color: 'var(--text-faint)' }} />
        <p className="t-caption leading-relaxed">
          Strength gain is a <span className="text-[var(--text-mid)] font-semibold">proxy</span> for muscle gain, not a direct measure.
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
    summary.status === 'on_track'       ? 'text-[var(--teal)]' :
    summary.status === 'above_expected' ? 'text-[var(--teal)]' :
    summary.status === 'below_expected' ? 'text-orange-400' :
    'text-[var(--text-mid)]'

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
          <p
            className="mono text-3xl tabular-nums tracking-tighter"
            style={{
              color: 'var(--text-hi)',
              textShadow: totalPct >= 0 ? '0 0 24px var(--accent-glow)' : 'none',
            }}
          >
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}
            <span className="text-base ml-0.5" style={{ color: 'var(--text-faint)', textShadow: 'none' }}>%</span>
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
        <ProgressionLineChart data={chartData} color="#7fd9c8" formatType="number" />
      </div>

      {trendLabel && (
        <p className={cn('text-[11px] font-semibold uppercase tracking-wider mt-2 text-center', trendColor)}>
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
    <div className="flex flex-wrap gap-x-4 gap-y-2 text-[9px] p-3.5 bg-ink/30 rounded-xl border border-glass-border/40" style={{ color: 'var(--text-low)' }}>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded bg-orange-400/20 border border-orange-400/35" />
        <span>MV – MEV <span className="ml-0.5 opacity-60">(Maintain)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded bg-yellow-400/25 border border-yellow-400/35" />
        <span>MEV – MAV <span className="ml-0.5 opacity-60">(Growing)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded bg-emerald-500/25 border border-emerald-500/35" />
        <span className="font-semibold text-[var(--teal)]">MAV <span className="ml-0.5 opacity-65">(Optimal)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded bg-orange-500/25 border border-orange-500/35" />
        <span>MAV – MRV <span className="ml-0.5 opacity-60">(High)</span></span>
      </span>
      <span className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded bg-red-500/25 border border-red-500/35" />
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
    ? 'bg-[var(--teal)]/10 border border-[var(--teal)]/20 text-[var(--teal)]'
    : 'bg-yellow-500/10 border border-yellow-500/20 text-yellow-400'

  return (
    <div className="glass-strong p-3.5 rounded-[var(--radius-inner)] border border-glass-border hover:border-glass-border-strong transition-all duration-300 group">
      {/* Header Info */}
      <div className="flex items-center justify-between mb-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={cn('w-2 h-2 rounded-full shrink-0 animate-pulse', styles.dot)} />
          <span className="text-xs font-bold uppercase tracking-wider truncate" style={{ color: 'var(--text-hi)' }}>
            {muscleGroup}
          </span>
          {freqLabel && (
            <span
              className={cn(
                "text-[8px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded shrink-0",
                freqStyle
              )}
            >
              {freqLabel}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[11px] tabular-nums font-semibold" style={{ color: 'var(--text-hi)' }}>
            {setCount} <span className="text-[9px] font-normal" style={{ color: 'var(--text-low)' }}>sets</span>
          </span>
          <span
            className={cn(
              "text-[8px] font-bold uppercase tracking-widest px-2 py-0.5 rounded-full border shrink-0",
              styles.bg,
              styles.border,
              styles.text
            )}
          >
            {styles.label}
          </span>
        </div>
      </div>

      {/* Bar visual */}
      <div className="relative h-2.5 rounded-full overflow-hidden bg-ink/75 border border-border-soft/60">
        {/* Shaded Landmark Zones */}
        <div className="absolute top-0 h-full bg-orange-400/5"
             style={{ left: `${mvPct}%`, width: `${Math.max(0, mevPct - mvPct)}%` }} />
        <div className="absolute top-0 h-full bg-yellow-400/10"
             style={{ left: `${mevPct}%`, width: `${Math.max(0, mavMinPct - mevPct)}%` }} />
        <div className="absolute top-0 h-full bg-emerald-500/15"
             style={{ left: `${mavMinPct}%`, width: `${Math.max(0, mavMaxPct - mavMinPct)}%` }} />
        <div className="absolute top-0 h-full bg-orange-400/10"
             style={{ left: `${mavMaxPct}%`, width: `${Math.max(0, mrvPct - mavMaxPct)}%` }} />
        <div className="absolute top-0 h-full bg-red-500/20"
             style={{ left: `${mrvPct}%`, right: 0 }} />

        {/* Zone Ticks/Dividers */}
        {[mvPct, mevPct, mavMinPct, mavMaxPct, mrvPct].map((p, idx) => (
          <div
            key={idx}
            className="absolute top-0 bottom-0 w-[1px] bg-ink/30 z-10"
            style={{ left: `${p}%` }}
          />
        ))}

        {/* User sets progress fill */}
        <div
          className={cn(
            "absolute top-0 left-0 h-full rounded-l-full bg-gradient-to-r transition-all duration-500 ease-out",
            styles.fillGradient
          )}
          style={{ width: `${markerPct}%` }}
        />

        {/* Glowing Cursor thumb */}
        <div
          className="absolute -top-0.5 bottom-[-2px] w-1 h-[14px] rounded-full bg-white transition-all duration-500 ease-out"
          style={{
            left: `${markerPct}%`,
            transform: 'translateX(-50%)',
            boxShadow: `0 0 8px ${styles.glowColor}, 0 0 3px #ffffff`
          }}
        />
      </div>

      {/* Threshold Row */}
      <div className="flex items-center justify-between mt-2.5 px-0.5 text-[9px] font-medium" style={{ color: 'var(--text-low)' }}>
        <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-orange-400/40" />
            <span>MV <strong style={{ color: 'var(--text-mid)' }}>{landmarks.mv}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-yellow-400/40" />
            <span>MEV <strong style={{ color: 'var(--text-mid)' }}>{landmarks.mev}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400/40" />
            <span>MAV <strong style={{ color: 'var(--text-mid)' }}>{landmarks.mav.min}-{landmarks.mav.max}</strong></span>
          </span>
          <span className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500/40" />
            <span>MRV <strong style={{ color: 'var(--text-mid)' }}>{landmarks.mrv}</strong></span>
          </span>
        </div>
        
        <span className="text-[9px] tracking-tight font-semibold" style={{ color: 'var(--text-mid)' }}>
          {status === 'below_mv' && `+${landmarks.mv - setCount} to MV`}
          {status === 'maintenance' && `+${landmarks.mev - setCount} to MEV`}
          {status === 'sub_optimal' && `+${landmarks.mav.min - setCount} to MAV`}
          {status === 'optimal' && `Optimal range`}
          {status === 'high' && `+${landmarks.mrv - setCount} to MRV`}
          {status === 'over_mrv' && `${setCount - landmarks.mrv} over MRV`}
        </span>
      </div>
    </div>
  )
}
