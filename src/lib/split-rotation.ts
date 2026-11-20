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

export function getNextSplitItem(input: SplitPointerInput): NextSplitItem | null {
  const items = [...input.items].sort((a, b) => a.position - b.position)
  if (!items.some(item => item.routineId !== null)) return null

  const inSplit = new Set(items.flatMap(item => (item.routineId ? [item.routineId] : [])))
  const [last, previous] = input.recentSplitWorkouts.filter(workout => inSplit.has(workout.routineId))

  const daysSinceLast = last ? daysBetween(new Date(last.startedAt), input.now) : null
  const result = (index: number): NextSplitItem => ({
    item: items[index],
    index,
    isRest: items[index].routineId === null,
    daysSinceLast,
    welcomeBack: daysSinceLast !== null && daysSinceLast >= WELCOME_BACK_DAYS,
  })

  const skipIsNewer = input.skip !== null
    && (!last || new Date(input.skip.setAt).getTime() > new Date(last.startedAt).getTime())
  if (input.skip && skipIsNewer) {
    return result(Math.min(Math.max(0, input.skip.position), items.length - 1))
  }

  if (!last) return result(0)

  const previousIndex = previous ? resolveIndex(items, previous.routineId, null) : null
  let index = (resolveIndex(items, last.routineId, previousIndex) + 1) % items.length
  let restDaysPassed = Math.max(0, (daysSinceLast ?? 0) - 1)
  while (restDaysPassed > 0 && items[index].routineId === null) {
    index = (index + 1) % items.length
    restDaysPassed--
  }
  return result(index)
}
