import Link from 'next/link'
import { History } from 'lucide-react'
import { Card, IconButton, SectionHeader } from '@/components/ui'
import type { CoachNote, CoachNoteKind } from '@/lib/home'

export interface RecentChat {
  id: string
  title: string | null
  /** Already formatted on the server, e.g. "Tue" or "12 Nov", so both renders agree. */
  when: string
}

interface CoachHomeProps {
  notes: CoachNote[]
  recentChats: RecentChat[]
  onAsk: (prompt: string) => void
  onOpenHistory: () => void
}

const RECENT_CHAT_LIMIT = 3

const KIND_LABEL: Record<CoachNoteKind, string> = {
  long_break: 'Light weeks',
  deload: 'Deload',
  phase_transition: 'Phase',
  dissociation: 'Size and strength',
  stalled_lift: 'Stalled lift',
  neglected_muscle: 'Neglected muscle',
}

// Kinds that ask the lifter to act get the caution colour; the rest are neutral.
const CAUTION_KINDS = new Set<CoachNoteKind>(['long_break', 'deload', 'stalled_lift'])

// What Coach shows before a chat starts: what it noticed this week, then recent chats.
export function CoachHome({ notes, recentChats, onAsk, onOpenHistory }: CoachHomeProps) {
  return (
    <div className="space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <p className="t-caption">Coach</p>
          <h1 className="t-display">This week</h1>
        </div>
        <IconButton aria-label="Past chats" onClick={onOpenHistory}>
          <History className="h-5 w-5" aria-hidden="true" />
        </IconButton>
      </header>

      <section className="space-y-3">
        <SectionHeader title="What I noticed" />
        {notes.length === 0 ? (
          <Card>
            <p className="t-body-sm">Nothing needs attention this week.</p>
          </Card>
        ) : (
          <Card padding="none">
            <ul>
              {notes.map((note, index) => (
                <CoachNoteRow key={note.kind} note={note} isFirst={index === 0} onAsk={onAsk} />
              ))}
            </ul>
          </Card>
        )}
      </section>

      {recentChats.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="t-title-3">Recent chats</h2>
            <button type="button" onClick={onOpenHistory} className="focus-ring min-h-11 text-sm text-secondary">
              See all
            </button>
          </div>
          <Card padding="none">
            <ul>
              {recentChats.slice(0, RECENT_CHAT_LIMIT).map((chat, index) => (
                <li key={chat.id} className={index > 0 ? 'border-t border-border' : undefined}>
                  <Link href={`/coach/${chat.id}`} className="focus-ring flex min-h-12 items-center justify-between gap-3 px-4">
                    <span className="t-body truncate">{chat.title || 'New chat'}</span>
                    <span className="t-caption shrink-0">{chat.when}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        </section>
      )}
    </div>
  )
}

function CoachNoteRow({ note, isFirst, onAsk }: { note: CoachNote; isFirst: boolean; onAsk: (prompt: string) => void }) {
  return (
    <li className={isFirst ? 'px-4 py-3' : 'border-t border-border px-4 py-3'}>
      <p className={CAUTION_KINDS.has(note.kind) ? 't-label text-caution' : 't-label'}>{KIND_LABEL[note.kind]}</p>
      <p className="t-body mt-1 font-semibold">{note.title}</p>
      {note.body && <p className="t-body-sm mt-1">{note.body}</p>}
      <div className="mt-1 flex flex-wrap items-center gap-x-5">
        <button type="button" onClick={() => onAsk(note.prompt)} className="focus-ring min-h-11 text-sm font-medium text-primary">
          Ask about this ›
        </button>
        <Link href={note.href} className="focus-ring inline-flex min-h-11 items-center text-sm text-secondary">
          {note.cta}
        </Link>
      </div>
    </li>
  )
}
