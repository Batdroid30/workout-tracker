import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { Card } from '@/components/ui'
import { LongBreakCard } from '@/components/dashboard/LongBreakCard'
import type { CoachNote } from '@/lib/home'

interface CoachNoteCardProps {
  note: CoachNote
  missedWeeks: number
}

export function CoachNoteCard({ note, missedWeeks }: CoachNoteCardProps) {
  // A long break needs a decision, not a link: restart or keep going.
  if (note.kind === 'long_break') return <LongBreakCard missedWeeks={missedWeeks} />

  return (
    <Card as="section">
      <p className="t-caption">Coach</p>
      <h2 className="t-title-3 mt-1">{note.title}</h2>
      <p className="t-body-sm mt-1">{note.body}</p>
      <Link href={note.href} className="focus-ring mt-3 -ml-1 inline-flex min-h-11 items-center gap-1 rounded px-1 text-sm font-medium text-primary">
        {note.cta}
        <ChevronRight className="w-4 h-4" aria-hidden="true" />
      </Link>
    </Card>
  )
}
