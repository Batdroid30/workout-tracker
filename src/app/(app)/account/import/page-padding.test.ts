import { describe, it, expect } from 'vitest'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

// The floating tab bar covers the bottom ~82px; every page that shows it
// reserves pb-28 so its last card can scroll clear.
describe('account import page', () => {
  it('reserves room for the tab bar below its last card', () => {
    const source = readFileSync(join(__dirname, 'page.tsx'), 'utf8')
    expect(source).toMatch(/min-h-screen[^"]*\bpb-28\b/)
  })
})
