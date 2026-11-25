import { describe, it, expect } from 'vitest'
import { chatWhen } from './chat-when'

const now = new Date('2026-11-25T15:00:00Z') // a Wednesday

describe('chatWhen', () => {
  it('says Today and Yesterday for the last two days', () => {
    expect(chatWhen('2026-11-25T08:00:00Z', now)).toBe('Today')
    expect(chatWhen('2026-11-24T23:00:00Z', now)).toBe('Yesterday')
  })

  it('uses the weekday within the last week', () => {
    expect(chatWhen('2026-11-20T10:00:00Z', now)).toBe('Fri')
  })

  it('uses the date for anything older', () => {
    expect(chatWhen('2026-11-12T10:00:00Z', now)).toBe('12 Nov')
  })
})
