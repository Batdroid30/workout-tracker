'use client'

import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface CalendarEntry {
  date:  string   // YYYY-MM-DD
  count: number
}

interface WorkoutCalendarProps {
  entries:    CalendarEntry[]
  /** How many past months to show if there are no workouts. Default 6. */
  monthCount?: number
}

interface MonthGridProps {
  year:         number
  month:        number   // 0-indexed
  workoutDates: Map<string, number>
  todayStr:     string
}

// Share of --positive painted for 1, 2 and 3+ sessions in a day.
const HEAT_INTENSITY = [35, 65, 100]

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

  return (
    <div className="grid grid-cols-7 gap-[4px] px-1">
      {cells.map((day, i) => {
        if (day === null) return <div key={i} className="aspect-square" />

        const dateStr = `${year}-${pad(month + 1)}-${pad(day)}`
        const count   = workoutDates.get(dateStr) ?? 0
        const isToday = dateStr === todayStr
        const isFuture = dateStr > todayStr

        const bg = count > 0
          ? `color-mix(in srgb, var(--positive) ${HEAT_INTENSITY[Math.min(count, 3) - 1]}%, transparent)`
          : 'var(--surface-raised)'

        return (
          <div
            key={i}
            title={count > 0 ? `${dateStr} — ${count} workout${count === 1 ? '' : 's'}` : dateStr}
            className="aspect-square rounded-[4px] flex items-center justify-center transition-all duration-150 active:scale-95 border select-none"
            style={{
              background:   bg,
              borderColor:  isToday ? 'var(--text-primary)' : 'transparent',
              opacity:      isFuture ? 0.3 : 1,
            }}
          >
            <span
              className="text-xs font-medium leading-none"
              style={{ color: count >= 2 ? 'var(--bg)' : count > 0 ? 'var(--text-primary)' : 'var(--text-tertiary)' }}
            >
              {day}
            </span>
          </div>
        )
      })}
    </div>
  )
}

const DAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S']

export function WorkoutCalendar({ entries, monthCount = 6 }: WorkoutCalendarProps) {
  // Build fast lookup map
  const workoutDates = useMemo(() => {
    const map = new Map<string, number>()
    for (const e of entries) map.set(e.date, e.count)
    return map
  }, [entries])

  // Build list of months to display (oldest first, ending with current month)
  const now = new Date()
  const today = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`

  const months = useMemo(() => {
    const list: { year: number; month: number }[] = []
    
    // Find oldest date or default to monthCount ago
    const oldestDateStr = entries[0]?.date
    let startDate = new Date()
    if (oldestDateStr) {
      const parts = oldestDateStr.split('-')
      startDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, 1)
    } else {
      startDate.setMonth(startDate.getMonth() - (monthCount - 1))
    }

    const currentYear = now.getFullYear()
    const currentMonth = now.getMonth()
    const end = new Date(currentYear, currentMonth, 1)

    // Generate month sequence
    const iter = new Date(startDate.getFullYear(), startDate.getMonth(), 1)
    let safety = 0
    while (iter <= end && safety < 600) {
      list.push({ year: iter.getFullYear(), month: iter.getMonth() })
      iter.setMonth(iter.getMonth() + 1)
      safety++
    }

    if (list.length === 0) {
      list.push({ year: currentYear, month: currentMonth })
    }

    return list
  }, [entries, monthCount])

  const [activeIndex, setActiveIndex] = useState(months.length - 1)
  const containerRef = useRef<HTMLDivElement>(null)
  const isScrollingRef = useRef(false)

  // Scroll to the end on mount or when months length updates
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollLeft = containerRef.current.scrollWidth
      setActiveIndex(months.length - 1)
    }
  }, [months.length])

  // Track scrolling to sync current active index
  const handleScroll = () => {
    if (!containerRef.current || isScrollingRef.current) return
    const container = containerRef.current
    const scrollLeft = container.scrollLeft
    const clientWidth = container.clientWidth
    if (clientWidth === 0) return

    const index = Math.round(scrollLeft / clientWidth)
    if (index >= 0 && index < months.length && index !== activeIndex) {
      setActiveIndex(index)
    }
  }

  // Smooth scroll helper
  const scrollToMonth = (index: number) => {
    if (!containerRef.current || index < 0 || index >= months.length) return
    isScrollingRef.current = true
    setActiveIndex(index)
    
    const container = containerRef.current
    container.scrollTo({
      left: index * container.clientWidth,
      behavior: 'smooth',
    })

    // Release scroll tracking lock after animation completes
    setTimeout(() => {
      isScrollingRef.current = false
    }, 400)
  };

  const scrollPrev = () => scrollToMonth(activeIndex - 1)
  const scrollNext = () => scrollToMonth(activeIndex + 1)

  const activeMonthLabel = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= months.length) return ''
    const { year, month } = months[activeIndex]
    return new Date(year, month).toLocaleDateString('en-US', {
      month: 'short',
      year: 'numeric',
    })
  }, [activeIndex, months])

  // Selected month statistics
  const activeMonthStats = useMemo(() => {
    if (activeIndex < 0 || activeIndex >= months.length) {
      return { workouts: 0, activeDays: 0, frequency: '0.0' }
    }
    const { year, month } = months[activeIndex]
    const prefix = `${year}-${pad(month + 1)}-`
    let workouts = 0
    let activeDays = 0

    for (const entry of entries) {
      if (entry.date.startsWith(prefix)) {
        workouts += entry.count
        activeDays += 1
      }
    }

    const daysInMonth = new Date(year, month + 1, 0).getDate()
    const weeksInMonth = daysInMonth / 7
    const frequency = (workouts / weeksInMonth).toFixed(1)

    return { workouts, activeDays, frequency }
  }, [activeIndex, months, entries])

  return (
    <div className="card p-4">
      {/* Header with Navigation */}
      <div className="flex items-center justify-between mb-4">
        <span className="t-label select-none">Training activity</span>
        
        {/* Month Selector */}
        <div className="flex items-center gap-1 bg-surface-raised border border-border rounded-lg p-0.5 shrink-0">
          <button
            onClick={scrollPrev}
            disabled={activeIndex === 0}
            className="p-1 rounded-md transition-colors hover:bg-surface disabled:opacity-20 disabled:pointer-events-none active:scale-95 shrink-0"
            title="Previous Month"
          >
            <ChevronLeft className="w-3.5 h-3.5 text-primary" />
          </button>
          <span className="text-xs font-semibold px-2.5 select-none min-w-[76px] text-center text-primary">
            {activeMonthLabel}
          </span>
          <button
            onClick={scrollNext}
            disabled={activeIndex === months.length - 1}
            className="p-1 rounded-md transition-colors hover:bg-surface disabled:opacity-20 disabled:pointer-events-none active:scale-95 shrink-0"
            title="Next Month"
          >
            <ChevronRight className="w-3.5 h-3.5 text-primary" />
          </button>
        </div>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="bg-surface-raised border border-border rounded-xl p-2.5 flex flex-col">
          <span className="text-xs text-tertiary font-semibold">Workouts</span>
          <span className="mono text-base font-bold text-primary mt-0.5 leading-none">
            {activeMonthStats.workouts}
          </span>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-2.5 flex flex-col">
          <span className="text-xs text-tertiary font-semibold">Active days</span>
          <span className="mono text-base font-bold text-primary mt-0.5 leading-none">
            {activeMonthStats.activeDays}
          </span>
        </div>
        <div className="bg-surface-raised border border-border rounded-xl p-2.5 flex flex-col">
          <span className="text-xs text-tertiary font-semibold">Frequency</span>
          <span className="mono text-base font-bold text-primary mt-0.5 leading-none">
            {activeMonthStats.frequency} <span className="text-xs font-normal text-tertiary">/wk</span>
          </span>
        </div>
      </div>

      {/* Pinned Day-of-week headers */}
      <div className="grid grid-cols-7 mb-1.5 px-1">
        {DAY_HEADERS.map((d, i) => (
          <div
            key={i}
            className="text-center text-xs font-semibold select-none text-tertiary"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Swipeable Viewport */}
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth w-full no-scrollbar select-none"
        style={{ scrollbarWidth: 'none' }}
      >
        {months.map(({ year, month }) => (
          <div key={`${year}-${month}`} className="w-full shrink-0 snap-center snap-always">
            <MonthGrid
              year={year}
              month={month}
              workoutDates={workoutDates}
              todayStr={today}
            />
          </div>
        ))}
      </div>

      {/* Month Page Indicators (Pills) */}
      {months.length > 1 && (
        <div className="flex justify-center items-center gap-1.5 mt-4 mb-2">
          {months.map((_, idx) => (
            <button
              key={idx}
              onClick={() => scrollToMonth(idx)}
              className="h-1 rounded-full transition-all duration-300 focus:outline-none"
              style={{
                width: idx === activeIndex ? '14px' : '4px',
                background: idx === activeIndex ? 'var(--text-primary)' : 'var(--border-strong)',
              }}
              title={`Go to month ${idx + 1}`}
            />
          ))}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center justify-between pt-3.5 border-t border-border mt-3">
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-tertiary font-semibold">No workout</span>
          <div className="w-2.5 h-2.5 rounded-[2px]" style={{ background: 'var(--surface-raised)' }} />
        </div>
        <div className="flex items-center gap-1">
          {HEAT_INTENSITY.map((pct, i) => (
            <div
              key={i}
              className="w-2.5 h-2.5 rounded-[2px]"
              style={{ background: `color-mix(in srgb, var(--positive) ${pct}%, transparent)` }}
            />
          ))}
          <span className="text-xs text-tertiary font-semibold ml-1">1 / 2 / 3+ sessions</span>
        </div>
      </div>
    </div>
  )
}

