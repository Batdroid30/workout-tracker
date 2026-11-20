import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { describe, it, expect } from 'vitest'

// iOS Safari zooms the page into any field whose text is under 16px, and the
// lifter then has to zoom back out by hand. Fields must use 16px or larger.
const SRC = join(__dirname, '..')
const FIELD = /<(input|textarea|select|Input)\b(?:=>|[^>])*>/g
const SMALL_TEXT = /(?<![\w:-])text-(xs|sm|\[(?:[0-9]|1[0-5])px\])(?![\w-])/

function sourceFiles(dir: string): string[] {
  return readdirSync(dir).flatMap(name => {
    const path = join(dir, name)
    if (statSync(path).isDirectory()) return sourceFiles(path)
    return path.endsWith('.tsx') && !path.endsWith('.test.tsx') ? [path] : []
  })
}

function smallFields(): string[] {
  return sourceFiles(SRC).flatMap(path => {
    const source = readFileSync(path, 'utf8')
    return [...source.matchAll(FIELD)]
      .filter(match => !/type="(checkbox|radio|file|hidden|range)"/.test(match[0]))
      .filter(match => SMALL_TEXT.test(match[0]))
      .map(match => `${relative(SRC, path)}:${source.slice(0, match.index).split('\n').length}`)
  })
}

describe('form fields', () => {
  it('use at least 16px text so phones do not zoom in on focus', () => {
    expect(smallFields()).toEqual([])
  })
})
