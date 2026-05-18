import { TrendingUp } from 'lucide-react'
import { InsightCard } from './InsightCard'
import type { HypertrophicDissociationResult } from '@/lib/data/insights'

interface HypertrophicDissociationCardProps {
  dissociation: HypertrophicDissociationResult
}

export function HypertrophicDissociationCard({ dissociation }: HypertrophicDissociationCardProps) {
  if (!dissociation.detected || !dissociation.message) return null

  return (
    <InsightCard
      title="Hypertrophic Dissociation"
      icon={<TrendingUp className="w-3.5 h-3.5" style={{ color: 'var(--rose)' }} />}
      variant="warning"
      dismissKey="insight-dissociation-dismiss"
    >
      <p className="text-sm text-[var(--text-low)] leading-relaxed">
        {dissociation.message}
      </p>
    </InsightCard>
  )
}
