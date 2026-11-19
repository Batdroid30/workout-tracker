import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const css = readFileSync(join(__dirname, 'globals.css'), 'utf8')

describe('globals.css', () => {
  it('imports the tokens file', () => {
    expect(css).toContain('@import "../styles/tokens.css"')
  })

  it('only assigns animations when reduced motion is not requested', () => {
    const guardIndex = css.indexOf('@media (prefers-reduced-motion: no-preference)')
    expect(guardIndex).toBeGreaterThan(-1)

    const animationIndexes = [...css.matchAll(/animation:/g)].map((match) => match.index ?? -1)
    expect(animationIndexes.length).toBeGreaterThan(0)
    for (const index of animationIndexes) {
      expect(index).toBeGreaterThan(guardIndex)
    }
  })

  it.each(['body::before', 'pulse-glow', 'backdrop-filter', '--g-aurora', '#F72585', '#07061A'])(
    'does not contain %s',
    (forbidden) => {
      expect(css).not.toContain(forbidden)
    },
  )

  it('draws a lime focus ring', () => {
    const focusRule = css.match(/:focus-visible\s*\{([^}]*)\}/)
    expect(focusRule).not.toBeNull()
    expect(focusRule?.[1]).toContain('outline: 2px solid var(--lime)')
    expect(focusRule?.[1]).toContain('outline-offset: 2px')
  })

  it('sets labels at 12px in sentence case', () => {
    const labelRule = css.match(/\.t-label\s*\{([^}]*)\}/)
    expect(labelRule).not.toBeNull()
    expect(labelRule?.[1]).toContain('font-size: 12px')
    expect(labelRule?.[1]).not.toContain('text-transform: uppercase')
  })
})
