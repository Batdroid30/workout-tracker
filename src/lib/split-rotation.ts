// A split is an ordered loop of routines and rest days. The next session is
// the item after the last workout that used one of the split's routines;
// calendar days that pass in between count as the rest days that follow, so
// time off never skips a workout or creates a debt. The app follows the
// lifter: doing a different split routine moves the loop to after it.

const DAY_MS = 86_400_000
const WELCOME_BACK_DAYS = 7

export interface SplitItem {
  id: string
  position: number
  routineId: string | null   // null = rest day
}

export interface SplitWorkout {
  routineId: string
  startedAt: string
}

export interface SplitPointerInput {
  items: SplitItem[]
  recentSplitWorkouts: SplitWorkout[]   // newest first
  skip: { position: number; setAt: string } | null
  now: Date
}

export interface NextSplitItem {
  item: SplitItem
  index: number
  isRest: boolean
  daysSinceLast: number | null
  welcomeBack: boolean
}

function utcDay(date: Date): number {
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate())
}

function daysBetween(from: Date, to: Date): number {
  return Math.floor((utcDay(to) - utcDay(from)) / DAY_MS)
}

function occurrences(items: SplitItem[], routineId: string): number[] {
  return items.flatMap((item, index) => (item.routineId === routineId ? [index] : []))
}

// When a routine appears more than once, take the occurrence that follows
// the previous split workout; otherwise the first one.
function resolveIndex(items: SplitItem[], routineId: string, previousIndex: number | null): number {
  const found = occurrences(items, routineId)
  if (previousIndex === null || found.length === 1) return found[0]
  const distance = (index: number) => (index - previousIndex - 1 + items.length) % items.length
  return found.reduce((best, index) => (distance(index) < distance(best) ? index : best))
}

// Resolve each workout relative to the one before it, oldest first, so a
// routine that appears several times maps to the right occurrence.
function resolveLastIndex(items: SplitItem[], newestFirst: SplitWorkout[]): number {
  let index: number | null = null
  for (const workout of [...newestFirst].reverse()) {
    index = resolveIndex(items, workout.routineId, index)
  }
  return index ?? 0
}

// Each calendar day that passes uses up one rest day at the pointer.
function skipRestDays(items: SplitItem[], start: number, restDays: number): number {
  let index = start
  let remaining = restDays
  while (remaining > 0 && items[index].routineId === null) {
    index = (index + 1) % items.length
    remaining--
  }
  return index
}

export function getNextSplitItem(input: SplitPointerInput): NextSplitItem | null {
  const items = [...input.items].sort((a, b) => a.position - b.position)
  if (!items.some(item => item.routineId !== null)) return null

  const inSplit = new Set(items.flatMap(item => (item.routineId ? [item.routineId] : [])))
  const splitWorkouts = input.recentSplitWorkouts.filter(workout => inSplit.has(workout.routineId))
  const last = splitWorkouts[0]

  const daysSinceLast = last ? daysBetween(new Date(last.startedAt), input.now) : null
  const result = (index: number): NextSplitItem => ({
    item: items[index],
    index,
    isRest: items[index].routineId === null,
    daysSinceLast,
    welcomeBack: daysSinceLast !== null && daysSinceLast >= WELCOME_BACK_DAYS,
  })

  // The pointer names a saved position; if that day was removed it no longer applies.
  const skipIndex = input.skip ? items.findIndex(item => item.position === input.skip?.position) : -1
  const skipIsNewer = input.skip !== null
    && (!last || new Date(input.skip.setAt).getTime() > new Date(last.startedAt).getTime())
  if (input.skip && skipIsNewer && skipIndex !== -1) {
    return result(skipRestDays(items, skipIndex, daysBetween(new Date(input.skip.setAt), input.now)))
  }

  if (!last) return result(0)

  const index = (resolveLastIndex(items, splitWorkouts.slice(0, items.length)) + 1) % items.length
  return result(skipRestDays(items, index, Math.max(0, (daysSinceLast ?? 0) - 1)))
}
