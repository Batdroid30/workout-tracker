import { InsightCard } from './InsightCard'
import type { PushPullBalance } from '@/lib/data/insights'

// ─── Push/Pull balance card ───────────────────────────────────────────────────
//
// Shows the user's upper-body push:pull ratio over the last 4 weeks. A
// balanced ratio sits in the 0.8–1.25 range. Outside that we surface a tip.
//
// Hidden when there's not enough data (under 10 total upper-body sets) —
// noisy signal isn't worth surfacing for new users.

interface PushPullBalanceCardProps {
  balance: PushPullBalance
}

const MIN_SETS_FOR_SIGNAL = 10

type Verdict = 'balanced' | 'push_heavy' | 'pull_heavy'

function getVerdict(ratio: number): Verdict {
  if (ratio > 1.25)  return 'push_heavy'
  if (ratio < 0.8)   return 'pull_heavy'
  return 'balanced'
}

const VERDICT_COPY: Record<Verdict, { headline: string; tip: string; variant: 'positive' | 'warning' }> = {
  balanced: {
    headline: 'Solid balance',
    tip:      'Push and pull volume are evenly matched. Keep it up.',
    variant:  'positive',
  },
  push_heavy: {
    headline: 'Push-heavy',
    tip:      'Add a row or pull-up day to balance things out — overdeveloped pushing weakens the back and rounds the shoulders.',
    variant:  'warning',
  },
  pull_heavy: {
    headline: 'Pull-heavy',
    tip:      'Add a press or push-up day. Pulls are great, but press strength matters too.',
    variant:  'warning',
  },
}

export function PushPullBalanceCard({ balance }: PushPullBalanceCardProps) {
  const total = balance.pushSets + balance.pullSets
  if (total < MIN_SETS_FOR_SIGNAL || balance.ratio === null) return null

  const verdict = getVerdict(balance.ratio)
  const copy    = VERDICT_COPY[verdict]

  // Bar geometry — show the % split visually.
  const pushPct = (balance.pushSets / total) * 100
  const pullPct = (balance.pullSets / total) * 100

  return (
    <InsightCard title="Push / Pull Balance" icon="⚖️" variant={copy.variant}>
      {/* ── Headline ratio ───────────────────────────────────────────── */}
      <div className="flex items-baseline gap-2 mb-3">
        <span className="text-2xl font-black text-white tabular-nums tracking-tighter">
          {balance.pushSets}
          <span className="text-[#334155] mx-1.5">:</span>
          {balance.pullSets}
        </span>
        <span className="text-[10px] font-black uppercase tracking-widest text-[#4a5568]">
          {copy.headline}
        </span>
      </div>

      {/* ── Split bar ───────────────────────────────────────────────── */}
      <div className="flex h-2 rounded-full overflow-hidden bg-[#0c1324] mb-2">
        <div className="bg-[#CCFF00]/60" style={{ width: `${pushPct}%` }} />
        <div className="bg-[#adb4ce]/40"  style={{ width: `${pullPct}%` }} />
      </div>
      <div className="flex justify-between text-[10px] font-black uppercase tracking-widest mb-3">
        <span className="text-[#CCFF00]/70">Push · {Math.round(pushPct)}%</span>
        <span className="text-[#adb4ce]/70">{Math.round(pullPct)}% · Pull</span>
      </div>

      <p className="text-[11px] text-[#4a5568] font-body leading-relaxed">
        {copy.tip}
      </p>
    </InsightCard>
  )
}
