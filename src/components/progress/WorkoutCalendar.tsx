// Server component — no client-side JS needed for a static calendar grid

interface CalendarEntry {
  date:  string   // YYYY-MM-DD
  count: number
}

interface WorkoutCalendarProps {
  entries:    CalendarEntry[]
  /** How many past months to show, including the current month. Default 4. */
  monthCount?: number
}

interface MonthGridProps {
  year:         number
  month:        number   // 0-indexed
  workoutDates: Map<string, number>
  todayStr:     string
}

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

function pad(n: number): string { return String(n).padStart(2, '0') }

function MonthGrid({ year, month, workoutDates, todayStr }: MonthGridProps) {
  const daysInMonth = new Date(year, month + 1, 0).getDate()

  // ISO week: Monday = column 0. JS getDay() returns 0=Sun..6=Sat.
  const firstDayISO = (new Date(year, month, 1).getDay() + 6) % 7

  // Build flat cell array: null = empty padding, number = day of month
  const cells: (number | null)[] = [
    ...Array(firstDayISO).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ]
  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null)

  const monthLabel = new Date(year, month).toLocaleDateString([], {
    month: 'long', year: 'numeric',
  })

  return (
    <div>
      <div className="text-[11px] font-semibold uppercase tracking-widest mb-2" style={{ color: 'var(--text-lo)' }}>
        {monthLabel}
      </div>

      {/* Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className="text-center text-[9px] font-medium"
            style={{ color: 'var(--text-lo)' }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7 gap-[3px]">
        {cells.map((day, i) => {
          if (day === null) return <div key={i} />

          const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
          const count   = workoutDates.get(dateStr) ?? 0
          const isToday = dateStr === todayStr
          // Future days (after today) shown dimmer
          const isFuture = dateStr > todayStr

          // Intensity: 1 session = 45%, 2 = 65%, 3+ = 85%
          const intensity = count === 0 ? 0 : count === 1 ? 45 : count === 2 ? 65 : 85
          const bg = count > 0
            ? `color-mix(in srgb, var(--accent) ${intensity}%, transparent)`
            : 'var(--surface-2)'

          return (
            <div
              key={i}
              title={count > 0 ? `${dateStr} — ${count} workout${count === 1 ? '' : 's'}` : dateStr}
              className="aspect-square rounded-[3px] flex items-center justify-center"
              style={{
                background:   bg,
                border:       isToday ? '1px solid var(--accent)' : '1px solid transparent',
                opacity:      isFuture ? 0.3 : 1,
              }}
            >
              {/* Show day number — tiny, dimmer for empty days */}
              <span
                className="text-[8px] leading-none select-none"
                style={{ color: count > 0 ? 'var(--text-hi)' : 'var(--text-lo)' }}
              >
                {day}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function WorkoutCalendar({ entries, monthCount = 4 }: WorkoutCalendarProps) {
  // Build fast lookup map
  const workoutDates = new Map<string, number>()
  for (const e of entries) workoutDates.set(e.date, e.count)

  // Build list of months to display (oldest first)
  const now   = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const months: { year: number; month: number }[] = []
  for (let i = monthCount - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
    months.push({ year: d.getFullYear(), month: d.getMonth() })
  }

  return (
    <div className="space-y-5">
      {months.map(({ year, month }) => (
        <MonthGrid
          key={`${year}-${month}`}
          year={year}
          month={month}
          workoutDates={workoutDates}
          todayStr={today}
        />
      ))}

      {/* Legend */}
      <div className="flex items-center gap-2 pt-1">
        <span className="text-[10px]" style={{ color: 'var(--text-lo)' }}>No workout</span>
        {[45, 65, 85].map((pct, i) => (
          <div
            key={i}
            className="w-3 h-3 rounded-[2px]"
            style={{ background: `color-mix(in srgb, var(--accent) ${pct}%, transparent)` }}
          />
        ))}
        <span className="text-[10px]" style={{ color: 'var(--text-lo)' }}>1 / 2 / 3+</span>
      </div>
    </div>
  )
}
