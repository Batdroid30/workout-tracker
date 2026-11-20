import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { BodyweightPoint } from '@/lib/data/bodyweight'
import type { TrainingPhase } from '@/types/database'

interface WeightChangeSummaryProps {
  bwHistory:     BodyweightPoint[]
  trainingPhase: TrainingPhase | null
}

interface RateVerdict {
  rateKgPerWeek: number
  label:         string
  detail:        string
  tone:          VerdictTone
}

type VerdictTone = 'positive' | 'caution' | 'negative'

const TONE_CLASSES: Record<VerdictTone, { text: string; tile: string; card: string }> = {
  positive: { text: 'text-positive', tile: 'bg-positive-soft border-positive/40', card: '' },
  caution:  { text: 'text-caution',  tile: 'bg-caution-soft border-caution/40',   card: 'border-caution/40' },
  negative: { text: 'text-negative', tile: 'bg-negative-soft border-negative/40', card: 'border-negative/40' },
}

// Linear regression slope (kg/week) over the provided readings
function weightChangeRate(history: BodyweightPoint[]): number | null {
  if (history.length < 3) return null

  const baseMs = new Date(history[0].date + 'T00:00:00Z').getTime()
  const pts = history.map(p => ({
    x: (new Date(p.date + 'T00:00:00Z').getTime() - baseMs) / (7 * 86_400_000),
    y: p.weight_kg,
  }))

  const n     = pts.length
  const meanX = pts.reduce((s, p) => s + p.x, 0) / n
  const meanY = pts.reduce((s, p) => s + p.y, 0) / n

  let num = 0, den = 0
  for (const p of pts) {
    num += (p.x - meanX) * (p.y - meanY)
    den += (p.x - meanX) ** 2
  }
  return den === 0 ? null : num / den
}

function classify(rate: number, phase: TrainingPhase | null): RateVerdict {
  const rateG = Math.round(rate * 1000)  // g/week for display

  if (phase === 'bulking') {
    if (rate > 0.75)  return { rateKgPerWeek: rate, label: 'Gaining too fast', detail: `+${rateG} g/wk — surplus likely too large. Excess may be stored as fat. Target: 250–500 g/wk.`, tone: 'negative' }
    if (rate >= 0.2)  return { rateKgPerWeek: rate, label: 'Gaining on track', detail: `+${rateG} g/wk — ideal lean bulk rate. Consistent training should convert most of this to muscle.`, tone: 'positive' }
    if (rate >= 0)    return { rateKgPerWeek: rate, label: 'Gaining slowly', detail: `+${rateG} g/wk — slightly below optimal. Consider adding 100–200 kcal/day.`, tone: 'caution' }
    return { rateKgPerWeek: rate, label: 'Losing weight in a bulk', detail: `${rateG} g/wk — calorie deficit despite bulk goal. Check food logging.`, tone: 'negative' }
  }

  if (phase === 'cutting') {
    if (rate < -1.0) return { rateKgPerWeek: rate, label: 'Cutting too aggressively', detail: `${rateG} g/wk — risk of muscle loss. Reduce deficit. Target: −500 to −750 g/wk.`, tone: 'negative' }
    if (rate <= -0.35) return { rateKgPerWeek: rate, label: 'Cutting on track', detail: `${rateG} g/wk — sustainable rate. Minimises muscle loss while creating a meaningful deficit.`, tone: 'positive' }
    if (rate < 0)   return { rateKgPerWeek: rate, label: 'Cutting slowly', detail: `${rateG} g/wk — below optimal cut rate. Increase activity or reduce 100–200 kcal/day.`, tone: 'caution' }
    return { rateKgPerWeek: rate, label: 'Not losing weight', detail: `${Math.abs(rateG) < 100 ? 'Stable' : `+${rateG} g/wk gaining`}. Recalculate maintenance calories.`, tone: 'negative' }
  }

  // Maingaining / unknown phase
  if (Math.abs(rate) <= 0.25) return { rateKgPerWeek: rate, label: 'Stable weight', detail: `${rateG > 0 ? '+' : ''}${rateG} g/wk — recomp range. Great for body composition improvement.`, tone: 'positive' }
  if (rate > 0.25) return { rateKgPerWeek: rate, label: 'Gaining', detail: `+${rateG} g/wk — exceeds maintenance. Consider whether this aligns with your goal.`, tone: 'caution' }
  return { rateKgPerWeek: rate, label: 'Losing', detail: `${rateG} g/wk — calorie deficit. If unintentional, increase intake.`, tone: 'caution' }
}

export function WeightChangeSummary({ bwHistory, trainingPhase }: WeightChangeSummaryProps) {
  const rate = weightChangeRate(bwHistory)

  if (rate === null) return (
    <div className="card p-4">
      <div className="t-label mb-1">Weight change rate</div>
      <p className="t-caption mt-1">Log at least 3 bodyweight readings to see your rate of change.</p>
    </div>
  )

  const verdict = classify(rate, trainingPhase)
  const Icon    = Math.abs(rate) < 0.1 ? Minus : rate > 0 ? TrendingUp : TrendingDown
  const rateGabs = Math.abs(Math.round(rate * 1000))
  const toneClasses = TONE_CLASSES[verdict.tone]

  return (
    <div className={`card p-4 ${toneClasses.card}`}>
      <div className="flex items-start gap-3">
        <div className={`w-8 h-8 rounded-control border flex items-center justify-center shrink-0 ${toneClasses.tile}`}>
          <Icon className={`w-4 h-4 ${toneClasses.text}`} />
        </div>
        <div className="flex-1">
          <div className="flex items-baseline justify-between">
            <span className={`t-caption font-semibold ${toneClasses.text}`}>
              {verdict.label}
            </span>
            <span className="mono text-sm font-semibold text-primary">
              {rate >= 0 ? '+' : '−'}{rateGabs}
              <span className="text-xs ml-0.5 text-tertiary">g/wk</span>
            </span>
          </div>
          <p className="t-caption mt-0.5">{verdict.detail}</p>
        </div>
      </div>
    </div>
  )
}
