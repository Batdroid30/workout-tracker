import { describe, it, expect } from 'vitest'
import { runAction } from './run-action'

describe('runAction', () => {
  it('reports success when the action resolves', async () => {
    const errors: string[] = []
    expect(await runAction(async () => {}, message => errors.push(message))).toBe(true)
    expect(errors).toEqual([])
  })

  it('reports the error instead of throwing when the action fails', async () => {
    const errors: string[] = []
    const ok = await runAction(async () => { throw new Error('Database error') }, message => errors.push(message))
    expect(ok).toBe(false)
    expect(errors).toEqual(['Database error'])
  })

  it('uses a readable fallback for non-Error failures', async () => {
    const errors: string[] = []
    await runAction(async () => { throw 'boom' }, message => errors.push(message))
    expect(errors).toEqual(['Something went wrong. Please try again.'])
  })
})
