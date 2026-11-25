import type { CoachProposal } from '@/lib/coach/proposals'

type ProposalOf<K extends CoachProposal['kind']> = Extract<CoachProposal, { kind: K }>
type NamedEntry = ProposalOf<'routine'>['exercises'][number]

function SetsByReps({ sets, reps }: { sets: number; reps: number }) {
  return <span className="mono">{sets} × {reps}</span>
}

function Reason({ text }: { text: string }) {
  return <p className="t-caption mt-1.5">{text}</p>
}

// An exercise counts as moved when what sits above it changed. Comparing
// absolute positions would flag everything below a single move.
function movedNames(before: string[], after: string[]): Set<string> {
  const moved = new Set<string>()
  after.forEach((name, index) => {
    const previousAfter = index > 0 ? after[index - 1] : null
    const beforeIndex = before.indexOf(name)
    const previousBefore = beforeIndex > 0 ? before[beforeIndex - 1] : null
    if (previousAfter !== previousBefore) moved.add(name)
  })
  return moved
}

function SwapBody({ proposal }: { proposal: ProposalOf<'swap'> }) {
  return (
    <>
      <div className="t-body-sm mt-2.5 space-y-0.5">
        <p><span className="text-tertiary line-through">{proposal.old_name}</span></p>
        <p className="font-medium text-primary">
          → {proposal.new_name} · <SetsByReps sets={proposal.target_sets} reps={proposal.target_reps} />
        </p>
      </div>
      <Reason text={proposal.reason} />
    </>
  )
}

function OrderColumn({ heading, names, bold }: { heading: string; names: string[]; bold: Set<string> }) {
  return (
    <div>
      <p className="t-label uppercase tracking-wide text-tertiary">{heading}</p>
      <ol className="t-caption mt-1 list-decimal space-y-1 pl-4">
        {names.map((name, index) => (
          <li key={`${name}-${index}`}>
            <span className={bold.has(name) ? 'font-semibold text-primary' : undefined}>{name}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function ReorderBody({ proposal }: { proposal: ProposalOf<'reorder'> }) {
  const moved = movedNames(proposal.before, proposal.after)
  return (
    <>
      <div className="mt-2 grid grid-cols-2 gap-3">
        <OrderColumn heading="Now" names={proposal.before} bold={new Set()} />
        <OrderColumn heading="After" names={proposal.after} bold={moved} />
      </div>
      <Reason text={proposal.reason} />
    </>
  )
}

function NewExerciseBody({ proposal }: { proposal: ProposalOf<'new_exercise'> }) {
  const { exercise, add_to } = proposal
  const muscles = [exercise.muscle_group, ...exercise.secondary_muscles, exercise.equipment].filter(Boolean).join(' · ')
  return (
    <>
      <p className="t-title-3 mt-1">{exercise.name}</p>
      <p className="t-caption mt-1">{muscles}. Added to your library as yours.</p>
      {add_to && (
        <p className="t-body-sm mt-2 font-medium text-primary">
          + {exercise.name} · <SetsByReps sets={add_to.target_sets} reps={add_to.target_reps} />
        </p>
      )}
    </>
  )
}

function EntryRow({ entry }: { entry: NamedEntry }) {
  const isNew = 'new_exercise' in entry
  return (
    <li className="flex items-center justify-between gap-3">
      <span className="min-w-0 truncate">{isNew ? `+ New: ${entry.name}` : entry.name}</span>
      <SetsByReps sets={entry.target_sets} reps={entry.target_reps} />
    </li>
  )
}

function RoutineBody({ proposal }: { proposal: ProposalOf<'routine'> }) {
  return (
    <>
      <p className="t-title-3 mt-1">{proposal.title}</p>
      {proposal.notes && <Reason text={proposal.notes} />}
      <ul className="t-body-sm mt-2 space-y-1">
        {proposal.exercises.map((entry, index) => <EntryRow key={`${entry.name}-${index}`} entry={entry} />)}
      </ul>
    </>
  )
}

function splitDayTitle(day: ProposalOf<'split'>['days'][number]): string {
  if (day.kind === 'rest') return 'Rest'
  return day.kind === 'new_routine' ? `+ New: ${day.title}` : day.title
}

function SplitBody({ proposal }: { proposal: ProposalOf<'split'> }) {
  return (
    <>
      <p className="t-title-3 mt-1">{proposal.name}</p>
      <ol className="t-body-sm mt-2 space-y-1">
        {proposal.days.map((day, index) => (
          <li key={index} className="flex gap-3">
            <span className="mono w-14 shrink-0 text-tertiary">Day {index + 1}</span>
            <span className="min-w-0 truncate">{splitDayTitle(day)}</span>
          </li>
        ))}
      </ol>
    </>
  )
}

export function CoachProposalBody({ proposal }: { proposal: CoachProposal }) {
  switch (proposal.kind) {
    case 'swap':         return <SwapBody proposal={proposal} />
    case 'reorder':      return <ReorderBody proposal={proposal} />
    case 'new_exercise': return <NewExerciseBody proposal={proposal} />
    case 'routine':      return <RoutineBody proposal={proposal} />
    case 'split':        return <SplitBody proposal={proposal} />
  }
}
