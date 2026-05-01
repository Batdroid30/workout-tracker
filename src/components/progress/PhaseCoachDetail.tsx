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

const VOLUME_STATUS_STYLES: Record<VolumeStatus, { dot: string; text: string; label: string }> = {
  below_mv:    { dot: 'bg-red-400',    text: 'text-red-400',    label: 'Below MV'    },
  maintenance: { dot: 'bg-orange-400', text: 'text-orange-400', label: 'Maintaining' },
  sub_optimal: { dot: 'bg-yellow-400', text: 'text-yellow-400', label: 'Sub-optimal' },
  optimal:     { dot: 'bg-[#CCFF00]',  text: 'text-[#CCFF00]',  label: 'Optimal'     },
  high:        { dot: 'bg-orange-400', text: 'text-orange-400', label: 'High'        },
  over_mrv:    { dot: 'bg-red-500',    text: 'text-red-500',    label: 'Over MRV'    },
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
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb4ce]">Phase Coach</h2>
        {phaseLabel && (
          <span className="text-[9px] font-black uppercase tracking-widest text-[#CCFF00] bg-[#CCFF00]/10 border border-[#CCFF00]/20 px-2.5 py-1 rounded-lg">
            {phaseLabel}
            {weeksInPhase && cycleLength
              ? ` · WK ${Math.min(weeksInPhase, cycleLength + 4)} / ${cycleLength}`
              : weeksInPhase ? ` · WK ${weeksInPhase}` : ''}
          </span>
        )}
      </div>

      {/* ── Mesocycle timeline (full) ───────────────────────────────── */}
      {mesocycle && (
        <div className="glass-panel border border-[#334155] rounded-xl p-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce]">
              Mesocycle · Wk {mesocycle.currentWeek} / {mesocycle.totalWeeks}
            </h3>
            <p className="text-[9px] font-body text-[#334155]">sessions / week</p>
          </div>
          <MesocycleTimeline mesocycle={mesocycle} />
          <p className="text-[10px] text-[#4a5568] font-body mt-3 leading-relaxed">
            Cycle length follows your experience and phase. Deload week is recommended —
            the Deload card on the dashboard will fire earlier if your fatigue signals spike.
          </p>
        </div>
      )}

      {/* ── Strength Index full chart ──────────────────────────────── */}
      <div className="glass-panel border border-[#334155] rounded-xl p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Compass className="w-3.5 h-3.5 text-[#CCFF00]" />
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce]">
            Strength Index
          </h3>
        </div>

        <StrengthIndexBlock summary={strengthIndex} chartData={indexChartData} />

        {/* Tracked lifts */}
        {keyLifts.length > 0 && (
          <div className="mt-4 pt-3 border-t border-[#1e293b]">
            <p className="text-[9px] font-black uppercase tracking-[0.2em] text-[#4a5568] mb-2">
              Tracked lifts ({keyLifts.length})
            </p>
            <div className="flex flex-wrap gap-1.5">
              {keyLifts.map(lift => (
                <span
                  key={lift.exerciseId}
                  className="text-[10px] font-black uppercase tracking-tight text-[#adb4ce] bg-[#0c1324] border border-[#1e293b] rounded px-2 py-1"
                  title={`${lift.sessionCount} sessions in last 12 weeks`}
                >
                  {lift.exerciseName}
                </span>
              ))}
            </div>
            <p className="text-[10px] text-[#4a5568] font-body mt-2">
              Auto-detected from your most-frequent compound lifts in the last 12 weeks.
            </p>
          </div>
        )}
      </div>

      {/* ── Volume Landmarks ───────────────────────────────────────── */}
      <div className="glass-panel border border-[#334155] rounded-xl p-4 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce]">
            Volume Landmarks · This Week
          </h3>
          <p className="text-[9px] font-body text-[#334155]">sets / week</p>
        </div>

        <VolumeLegend />

        <div className="space-y-2.5 mt-3">
          {sortedLandmarks.map(point => (
            <VolumeLandmarkRow key={point.muscleGroup} point={point} />
          ))}
        </div>

        <p className="text-[10px] text-[#4a5568] font-body mt-3 leading-relaxed">
          Bands shift with your phase and style. Cuts shrink the recoverable
          ceiling; bulks raise it.
        </p>
      </div>

      {/* ── Honesty footer ─────────────────────────────────────────── */}
      <div className="flex items-start gap-2 px-1">
        <Info className="w-3 h-3 text-[#334155] shrink-0 mt-0.5" />
        <p className="text-[10px] text-[#4a5568] font-body leading-relaxed">
          Strength gain is a <span className="text-[#adb4ce] font-black">proxy</span> for muscle gain, not a direct measure.
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
      <p className="text-[11px] text-[#4a5568] font-body leading-relaxed mt-2">
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
    summary.status === 'on_track'       ? 'text-[#CCFF00]' :
    summary.status === 'above_expected' ? 'text-[#CCFF00]' :
    summary.status === 'below_expected' ? 'text-orange-400' :
    'text-[#adb4ce]'

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
          <p className="text-3xl font-black text-white tabular-nums tracking-tighter">
            {totalPct >= 0 ? '+' : ''}{totalPct.toFixed(1)}
            <span className="text-base text-[#4a5568] ml-0.5">%</span>
          </p>
          <p className="text-[10px] font-black text-[#4a5568] uppercase tracking-widest mt-0.5">
            Since phase start
          </p>
        </div>
        {pctPerWeek !== null && (
          <div className="text-right">
            <p className={cn('text-xl font-black tabular-nums tracking-tight', trendColor)}>
              {pctPerWeek >= 0 ? '+' : ''}{pctPerWeek.toFixed(2)}%
            </p>
            <p className="text-[10px] font-black text-[#4a5568] uppercase tracking-widest mt-0.5">
              per week
            </p>
          </div>
        )}
      </div>

      {/* Full chart */}
      <div className="h-[180px] w-full">
        <ProgressionLineChart data={chartData} color="#CCFF00" formatType="number" />
      </div>

      {trendLabel && (
        <p className={cn('text-[11px] font-black uppercase tracking-wider mt-2 text-center', trendColor)}>
          {trendLabel}
        </p>
      )}

      <p className="text-[10px] text-[#334155] font-body mt-2 text-center">
        Avg of weekly best e1RM across {summary.liftCount} key lift{summary.liftCount === 1 ? '' : 's'}, normalised to phase start.
      </p>
    </div>
  )
}

// ── Legend explaining the bands ─────────────────────────────────────────────

function VolumeLegend() {
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[9px] font-body text-[#4a5568]">
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-orange-400/30" /> MV → MEV (maintain)
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-yellow-400/40" /> MEV → MAV (growing)
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-[#CCFF00]/50" /> MAV (optimal)
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-orange-400/40" /> MAV → MRV (high)
      </span>
      <span className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-sm bg-red-500/40" /> Above MRV
      </span>
    </div>
  )
}

// ── Volume landmark row — same visual as dashboard, larger spacing ──────────

function VolumeLandmarkRow({ point }: { point: MuscleVolumeLandmarkPoint }) {
  const { muscleGroup, setCount, weeklyFrequency, landmarks, status } = point
  const styles = VOLUME_STATUS_STYLES[status]

  const scaleMax = Math.max(landmarks.mrv * 1.2, setCount * 1.05, 1)
  const pct = (n: number) => Math.min(100, (n / scaleMax) * 100)

  const mvPct     = pct(landmarks.mv)
  const mevPct    = pct(landmarks.mev)
  const mavMinPct = pct(landmarks.mav.min)
  const mavMaxPct = pct(landmarks.mav.max)
  const mrvPct    = pct(landmarks.mrv)
  const markerPct = pct(setCount)

  const freqSessions = weeklyFrequency > 0 ? Math.max(1, Math.round(weeklyFrequency)) : 0
  const freqLabel    = freqSessions > 0 ? `${freqSessions}×/wk` : null
  const freqColor    = freqSessions >= 2 ? 'text-[#CCFF00] bg-[#CCFF00]/10' : 'text-yellow-400 bg-yellow-400/10'

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5 min-w-0">
          <span className={cn('w-1.5 h-1.5 rounded-full shrink-0', styles.dot)} />
          <span className="text-xs font-black uppercase tracking-tight text-white truncate">
            {muscleGroup}
          </span>
          {freqLabel && (
            <span className={cn('text-[8px] font-black uppercase tracking-widest px-1.5 py-0.5 rounded shrink-0', freqColor)}>
              {freqLabel}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className="text-[10px] tabular-nums text-[#adb4ce] font-black">
            {setCount}
            <span className="text-[#334155] font-body ml-1">/ MEV {landmarks.mev} · MAV {landmarks.mav.max}</span>
          </span>
          <span className={cn('text-[8px] font-black uppercase tracking-widest w-[60px] text-right', styles.text)}>
            {styles.label}
          </span>
        </div>
      </div>

      <div className="relative h-2 bg-[#0c1324] rounded-full overflow-visible">
        <div className="absolute top-0 h-full bg-orange-400/15 rounded-full"
             style={{ left: `${mvPct}%`, width: `${Math.max(0, mevPct - mvPct)}%` }} />
        <div className="absolute top-0 h-full bg-yellow-400/20"
             style={{ left: `${mevPct}%`, width: `${Math.max(0, mavMinPct - mevPct)}%` }} />
        <div className="absolute top-0 h-full bg-[#CCFF00]/30"
             style={{ left: `${mavMinPct}%`, width: `${Math.max(0, mavMaxPct - mavMinPct)}%` }} />
        <div className="absolute top-0 h-full bg-orange-400/20"
             style={{ left: `${mavMaxPct}%`, width: `${Math.max(0, mrvPct - mavMaxPct)}%` }} />
        <div className="absolute top-0 h-full bg-red-500/30 rounded-r-full"
             style={{ left: `${mrvPct}%`, right: 0 }} />
        <div className={cn('absolute -top-0.5 bottom-[-2px] w-0.5 rounded-full', styles.dot)}
             style={{ left: `${markerPct}%`, transform: 'translateX(-50%)' }} />
      </div>
    </div>
  )
}
