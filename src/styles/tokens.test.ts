import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { contrastRatio } from '@/lib/design/contrast'

const css = readFileSync(join(__dirname, 'tokens.css'), 'utf8')
const rootBlocks = [...css.matchAll(/:root\s*\{([^}]*)\}/g)].map((match) => match[1])

function extractTokens(block: string): Record<string, string> {
  const tokens: Record<string, string> = {}
  for (const match of block.matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    tokens[match[1]] = match[2].trim()
  }
  return tokens
}

const tokens = extractTokens(rootBlocks[0])
const legacy = extractTokens(rootBlocks[1])

const REQUIRED_TOKENS = [
  '--bg', '--surface', '--surface-raised', '--border', '--border-strong',
  '--text-primary', '--text-secondary', '--text-tertiary',
  '--lime', '--lime-pressed', '--on-accent', '--lime-soft',
  '--positive', '--caution', '--negative',
  '--positive-soft', '--caution-soft', '--negative-soft',
  '--data-1', '--data-2', '--data-3', '--data-4', '--data-5', '--data-6',
  '--radius-card', '--radius-sheet', '--radius-control', '--radius-field', '--radius-pill',
  '--shadow-overlay',
]

function resolve(name: string): string {
  const value = tokens[name]
  const reference = /^var\((--[\w-]+)\)$/.exec(value)
  return reference ? tokens[reference[1]] : value
}

describe('tokens.css', () => {
  it.each(REQUIRED_TOKENS)('defines %s', (name) => {
    expect(tokens[name]).toBeDefined()
  })

  it('keeps legacy aliases in a second :root block', () => {
    expect(legacy['--accent']).toBe('var(--text-primary)')
    expect(legacy['--accent-on']).toBe('var(--bg)')
    expect(legacy['--text-hi']).toBe('var(--text-primary)')
    for (const name of ['--text-mid', '--text-low', '--ink', '--teal', '--rose', '--glass-fill']) {
      expect(legacy[name]).toBeDefined()
    }
  })

  const pairs: [fg: string, bg: string, min: number][] = [
    ['--text-primary', '--bg', 7], ['--text-primary', '--surface', 7], ['--text-primary', '--surface-raised', 7],
    ['--text-secondary', '--bg', 4.5], ['--text-secondary', '--surface', 4.5], ['--text-secondary', '--surface-raised', 4.5],
    ['--text-tertiary', '--surface', 4.5], ['--text-tertiary', '--surface-raised', 4.5],
    ['--on-accent', '--lime', 4.5], ['--lime', '--surface', 4.5],
    ['--positive', '--surface', 4.5], ['--caution', '--surface', 4.5], ['--negative', '--surface', 4.5],
    ['--lime', '--bg', 3], ['--lime', '--surface-raised', 3],
  ]

  it.each(pairs)('%s on %s is at least %s:1', (foreground, background, minimum) => {
    expect(contrastRatio(resolve(foreground), resolve(background))).toBeGreaterThanOrEqual(minimum)
  })
})
