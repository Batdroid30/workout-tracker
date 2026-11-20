import Link from 'next/link'
import { Trophy } from 'lucide-react'
import { Card, Chip, SectionHeader } from '@/components/ui'
import { PR_TYPE_LABELS, formatPRValue } from '@/lib/pr-format'
import { tonnes, type Highlight } from '@/lib/home'

const SECONDS_PER_MINUTE = 60

function dayLabel(iso: string): string {
  return new Date(iso).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
}

export function LatestHighlight({ highlight }: { highlight: Highlight }) {
  return (
    <section>
      <SectionHeader title="Latest" />
      <div className="mt-3">
        {highlight.kind === 'pr' ? <PRHighlight highlight={highlight} /> : <WorkoutHighlight highlight={highlight} />}
      </div>
    </section>
  )
}

function PRHighlight({ highlight }: { highlight: Extract<Highlight, { kind: 'pr' }> }) {
  return (
    <Card>
      <Chip tone="accent" icon={<Trophy className="w-3.5 h-3.5" aria-hidden="true" />}>New best</Chip>
      <h3 className="t-title-3 mt-3">{highlight.exerciseName}</h3>
      <p className="t-body-sm mt-1">
        {PR_TYPE_LABELS[highlight.prType]} <span className="mono text-primary">{formatPRValue(highlight.prType, highlight.value)}</span>
      </p>
    </Card>
  )
}

function WorkoutHighlight({ highlight }: { highlight: Extract<Highlight, { kind: 'workout' }> }) {
  const facts = [
    dayLabel(highlight.startedAt),
    highlight.durationSeconds ? `${Math.round(highlight.durationSeconds / SECONDS_PER_MINUTE)} min` : null,
    `${tonnes(highlight.volumeKg)} t`,
  ].filter(Boolean).join(' · ')

  return (
    <Link href={`/workout/${highlight.id}`} className="focus-ring block rounded-card">
      <Card>
        <p className="t-caption">Last workout</p>
        <h3 className="t-title-3 mt-1">{highlight.title}</h3>
        <p className="t-body-sm mt-1">{facts}</p>
      </Card>
    </Link>
  )
}
