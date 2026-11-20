import { describe, it, expect } from 'vitest'
import { formatDuration, isSameLocalDay, restRemainingMs } from './time'

describe('formatDuration', () => {
  it.each([
    [0, '0:00'],
    [74_000, '1:14'],
    [3_725_000, '1:02:05'],
    [-5_000, '0:00'],
  ])('formats %i ms as %s', (ms, text) => {
    expect(formatDuration(ms)).toBe(text)
  })
})

describe('restRemainingMs', () => {
  const now = 1_000_000

  it('is zero once rest has run out, however long ago', () => {
    expect(restRemainingMs({ endsAt: now - 600_000 }, now)).toBe(0)
  })

  it('counts down to the end time', () => {
    expect(restRemainingMs({ endsAt: now + 30_000 }, now)).toBe(30_000)
  })

  it('has nothing to count without a rest', () => {
    expect(restRemainingMs(null, now)).toBeNull()
  })
})

describe('isSameLocalDay', () => {
  // Pinned to India (UTC+5:30): a late workout falls on the next UTC date.
  const lateWorkout = '2026-11-20T18:00:00Z' // 23:30 IST on the 20th
  const inZone = (iso: string) => new Date(iso)

  it('treats a workout at 23:30 as today until local midnight', () => {
    expect(isSameLocalDay(lateWorkout, inZone('2026-11-20T18:20:00Z'), 'Asia/Kolkata')).toBe(true)
  })

  it('moves on at local midnight', () => {
    expect(isSameLocalDay(lateWorkout, inZone('2026-11-20T18:31:00Z'), 'Asia/Kolkata')).toBe(false)
  })

  it('uses the device time zone by default', () => {
    const now = new Date()
    expect(isSameLocalDay(now.toISOString(), now)).toBe(true)
  })
})
