import { describe, it, expect, vi } from 'vitest'
import { setNewPassword } from './set-new-password'

function fakeAuth(updateError: Error | null = null) {
  return {
    updateUser: vi.fn().mockResolvedValue({ error: updateError }),
    signOut: vi.fn().mockResolvedValue({ error: null }),
  }
}

describe('setNewPassword', () => {
  it('signs the account out everywhere once the password has changed', async () => {
    // Whoever might have had access, on any device, loses it with the old password.
    const auth = fakeAuth()

    expect(await setNewPassword(auth, 'new-secret')).toBeNull()
    expect(auth.updateUser).toHaveBeenCalledWith({ password: 'new-secret' })
    expect(auth.signOut).toHaveBeenCalledWith({ scope: 'global' })
  })

  it('keeps everyone signed in and reports why when the change fails', async () => {
    const auth = fakeAuth(new Error('Password should be different from the old password.'))

    expect(await setNewPassword(auth, 'same-secret')).toBe('Password should be different from the old password.')
    expect(auth.signOut).not.toHaveBeenCalled()
  })
})
