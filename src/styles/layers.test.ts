import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, it, expect } from 'vitest'

// Confirmations are often opened from a sheet ("Discard workout?" from the
// finish sheet), so the dialog layer must sit above the sheet layer.
const read = (path: string) => readFileSync(join(__dirname, '..', path), 'utf8')
const zOf = (source: string) => {
  const match = source.match(/fixed inset-0 z-(?:\[(\d+)\]|(\d+))/)
  return Number(match?.[1] ?? match?.[2] ?? NaN)
}

describe('overlay layers', () => {
  it('shows confirm dialogs above bottom sheets', () => {
    const dialog = zOf(read('providers/DialogProvider.tsx'))
    const sheet = zOf(read('components/ui/BottomSheet.tsx'))
    expect(dialog).toBeGreaterThan(sheet)
  })
})
