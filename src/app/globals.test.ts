import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8')

// An animation that keeps applying after it ends (fill "both"/"forwards")
// turns its element into its own stacking context. Every page sits inside
// .page-in, so full-screen sheets in a page would stack under the bottom nav.
describe('entrance animations', () => {
  it.each(['.page-in', '.tab-fade-in', '.fade-up'])('%s stops applying once it ends', selector => {
    const start = css.indexOf(`${selector} `)
    const rule = start === -1 ? '' : css.slice(start, css.indexOf('}', start))
    expect(rule).toContain('backwards')
    expect(rule).not.toMatch(/\b(both|forwards)\b/)
  })

  it('staggered children only hold their start state', () => {
    expect(css).toMatch(/\.stagger-children > \*\s*\{\s*animation-fill-mode: backwards;/)
  })
})
