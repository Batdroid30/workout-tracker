import { Scale, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { ProgressionLineChart } from '@/components/ui/ProgressionLineChart'
import { BodyweightLogger } from './BodyweightLogger'
import type { BodyweightPoint } from '@/lib/data/bodyweight'
import type { TrainingPhase } from '@/types/database'

// ─── Bodyweight section for /progress ────────────────────────────────────────
//
// Shows a 12-week weight trend line, a phase-aware interpretation of whether
// the trajectory matches the goal (bulking → should rise, cutting → should
// fall, maingaining → should stay stable), and a quick-log input to add a
// new reading.
//
// Honesty layer: weight change is stated plainly — no body composition claims.
// "Weight trending up" not "you're gaining muscle."

interface BodyweightSectionProps {
  history:       BodyweightPoint[]
  latestWeight:  BodyweightPoint | null
  trainingPhase: TrainingPhase   | null
}

export function BodyweightSection({
  history,
  latestWeight,
  trainingPhase,
}: BodyweightSectionProps) {
  const chartData = history.map(p => ({
    date:  new Date(p.date + 'T00:00:00').toLocaleDateString([], { month: 'short', day: 'numeric' }),
    value: p.weight_kg,
  }))

  const delta4w   = computeDelta4Weeks(history)
  const signal    = phaseSignal(delta4w, trainingPhase)

  return (
    <section>
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-xs font-black uppercase tracking-[0.2em] text-[#adb4ce]">Bodyweight</h2>
        {latestWeight && (
          <span className="text-[9px] font-black uppercase tracking-widest text-[#60a5fa] bg-blue-400/10 border border-blue-400/20 px-2.5 py-1 rounded-lg">
            {latestWeight.weight_kg} kg
          </span>
        )}
      </div>

      <div className="glass-panel border border-[#334155] rounded-xl p-4 space-y-3">

        {/* ── Trend chart ────────────────────────────────────────────── */}
        {chartData.length > 1 ? (
          <div className="h-[160px] w-full">
            <ProgressionLineChart data={chartData} color="#60a5fa" formatType="number" />
          </div>
        ) : (
          <div className="h-[60px] flex items-center justify-center">
            <p className="text-[11px] text-[#334155] font-body tracking-wide">
              Log a few readings to see your weight trend.
            </p>
          </div>
        )}

        {/* ── 4-week delta + phase signal ────────────────────────────── */}
        {(delta4w !== null || signal) && (
          <div className="flex items-center justify-between">
            {delta4w !== null && (
              <div className="flex items-center gap-1.5">
                {delta4w > 0.2
                  ? <TrendingUp  className="w-3.5 h-3.5 text-[#60a5fa]" />
                  : delta4w < -0.2
                  ? <TrendingDown className="w-3.5 h-3.5 text-[#60a5fa]" />
                  : <Minus        className="w-3.5 h-3.5 text-[#4a5568]" />
                }
                <span className="text-[11px] font-black tabular-nums text-white">
                  {delta4w > 0 ? '+' : ''}{delta4w.toFixed(1)} kg
                </span>
                <span className="text-[10px] text-[#4a5568] font-body">vs 4 wks ago</span>
              </div>
            )}
            {signal && (
              <p className={`text-[10px] font-black uppercase tracking-wider ${signal.color}`}>
                {signal.label}
              </p>
            )}
          </div>
        )}

        {/* ── Quick-log input ────────────────────────────────────────── */}
        <BodyweightLogger latestWeight={latestWeight?.weight_kg ?? null} />

      </div>

      <p className="text-[10px] text-[#4a5568] font-body mt-2 px-1 leading-relaxed">
        Log in the morning, fasted, for consistent readings. Weight fluctuates
        ±1–2 kg day-to-day — track the trend over weeks, not individual numbers.
      </p>
    </section>
  )
}

// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the weight change (kg) between the average of the most-recent 3
 * readings and the average of readings 4+ weeks ago.
 * Returns null when there aren't enough data points to be meaningful.
 */
function computeDelta4Weeks(history: BodyweightPoint[]): number | null {
  if (history.length < 4) return null

  const cutoffMs = Date.now() - 28 * 86400_000

  const recent = history.filter(p => new Date(p.date).getTime() >= cutoffMs)
  const earlier = history.filter(p => new Date(p.date).getTime() < cutoffMs)

  if (recent.length === 0 || earlier.length === 0) return null

  const avgRecent  = recent.reduce((s, p) => s + p.weight_kg, 0) / recent.length
  const avgEarlier = earlier.reduce((s, p) => s + p.weight_kg, 0) / earlier.length

  return Number((avgRecent - avgEarlier).toFixed(1))
}

interface PhaseSignal {
  label: string
  color: string
}

/**
 * Maps the 4-week weight delta onto a phase-specific interpretation.
 * Only called when enough data exists. Statements are about weight movement,
 * never about body composition — that requires DEXA/skinfolds, not a scale.
 */
function phaseSignal(delta: number | null, phase: TrainingPhase | null): PhaseSignal | null {
  if (delta === null || !phase) return null

  if (phase === 'bulking') {
    if (delta >  0.3) return { label: 'Trending up — bulk on track',        color: 'text-[#CCFF00]'  }
    if (delta < -0.3) return { label: 'Weight dropping — increase intake',  color: 'text-orange-400' }
    return               { label: 'Stable — small surplus needed',          color: 'text-yellow-400' }
  }

  if (phase === 'cutting') {
    if (delta < -0.2) return { label: 'Trending down — cut on track',       color: 'text-[#CCFF00]'  }
    if (delta >  0.2) return { label: 'Weight rising — review intake',      color: 'text-orange-400' }
    return               { label: 'Stable — maintain deficit',              color: 'text-yellow-400' }
  }

  // maingaining
  if (Math.abs(delta) <= 0.5) return { label: 'Stable — maingaining on track',       color: 'text-[#CCFF00]'  }
  if (delta >  0.5)           return { label: 'Slight gain — strength-first working', color: 'text-yellow-400' }
  return                       { label: 'Weight drifting down — check intake',        color: 'text-orange-400' }
}
