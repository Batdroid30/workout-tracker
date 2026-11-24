interface PasswordAuth {
  updateUser(attributes: { password: string }): Promise<{ error: { message: string } | null }>
  signOut(options: { scope: 'global' }): Promise<{ error: unknown }>
}

// Changes the password, then ends every session on every device, this one
// included, so the lifter signs in fresh with the new password.
// Returns an error message, or null on success.
export async function setNewPassword(auth: PasswordAuth, password: string): Promise<string | null> {
  const { error } = await auth.updateUser({ password })
  if (error) return error.message

  // The password has already changed, so a failed sign-out isn't the lifter's problem.
  const { error: signOutError } = await auth.signOut({ scope: 'global' })
  if (signOutError) console.error('Could not sign out other sessions after a password reset', signOutError)
  return null
}
