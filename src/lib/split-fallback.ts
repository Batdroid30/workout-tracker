// Suggests a session when the lifter has no active split: the saved routine
// that best covers the muscles they've trained least recently, else a focus
// (which opens the session generator).

const TOP_NEGLECTED = 3

export interface FallbackRoutine {
  id: string
  title: string
  createdAt: string
  muscleGroups: string[]   // one entry per routine exercise
}

interface NeglectedMuscle {
  muscleGroup: string
  daysSinceLastTrained: number
}

interface FocusSuggestion {
  focus: string
  muscleGroups: string[]
  reason: string
}

export type FallbackSuggestion =
  | { kind: 'routine'; routineId: string; title: string; reason: string }
  | ({ kind: 'focus' } & FocusSuggestion)

interface Scored {
  routine: FallbackRoutine
  covered: NeglectedMuscle[]
  topCount: number
}

function compare(a: Scored, b: Scored): number {
  return b.covered.length - a.covered.length
    || b.topCount - a.topCount
    || new Date(b.routine.createdAt).getTime() - new Date(a.routine.createdAt).getTime()
}

export function pickFallbackSuggestion(
  routines: FallbackRoutine[],
  neglected: NeglectedMuscle[],
  focus: FocusSuggestion | null,
): FallbackSuggestion | null {
  const top = neglected.slice(0, TOP_NEGLECTED)

  const best = routines
    .map(routine => ({
      routine,
      covered: top.filter(muscle => routine.muscleGroups.includes(muscle.muscleGroup)),
      topCount: top.length > 0 ? routine.muscleGroups.filter(group => group === top[0].muscleGroup).length : 0,
    }))
    .filter(scored => scored.covered.length > 0)
    .sort(compare)[0]

  if (best) {
    const lead = best.covered[0]
    return {
      kind: 'routine',
      routineId: best.routine.id,
      title: best.routine.title,
      reason: `Covers ${lead.muscleGroup} — ${lead.daysSinceLastTrained} days since you trained it`,
    }
  }

  return focus ? { kind: 'focus', ...focus } : null
}
