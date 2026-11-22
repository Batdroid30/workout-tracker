import { describe, it, expect, vi } from 'vitest'
import { BAD_LINK_PATH, confirmEmailLink } from './confirm-email-link'

const params = (query: string) => new URLSearchParams(query)

describe('confirmEmailLink', () => {
  it('signs the lifter in from a reset link and opens the new-password form', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: null })

    expect(await confirmEmailLink(params('token_hash=abc123&type=recovery'), verifyOtp)).toBe('/reset-password')
    expect(verifyOtp).toHaveBeenCalledWith({ type: 'recovery', token_hash: 'abc123' })
  })

  it('sends an expired or used link back to request a new one', async () => {
    const verifyOtp = vi.fn().mockResolvedValue({ error: new Error('Token has expired or is invalid') })

    expect(await confirmEmailLink(params('token_hash=abc123&type=recovery'), verifyOtp)).toBe(BAD_LINK_PATH)
  })

  it('never checks a link with a missing token or another kind of email', async () => {
    const verifyOtp = vi.fn()

    expect(await confirmEmailLink(params('type=recovery'), verifyOtp)).toBe(BAD_LINK_PATH)
    expect(await confirmEmailLink(params('token_hash=abc123&type=signup'), verifyOtp)).toBe(BAD_LINK_PATH)
    expect(verifyOtp).not.toHaveBeenCalled()
  })

  it('treats a failed check as a bad link', async () => {
    const verifyOtp = vi.fn().mockRejectedValue(new Error('network'))

    expect(await confirmEmailLink(params('token_hash=abc123&type=recovery'), verifyOtp)).toBe(BAD_LINK_PATH)
  })
})
