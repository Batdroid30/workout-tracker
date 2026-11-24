interface SessionSource {
  getSession(): Promise<{ data: { session: unknown } }>
}

// getSession waits for the browser client to finish reading the reset link from
// the URL, so no session afterwards means the link can't be used.
export async function checkResetLink(auth: SessionSource): Promise<'ready' | 'error'> {
  try {
    const { data } = await auth.getSession()
    return data.session ? 'ready' : 'error'
  } catch (error: unknown) {
    console.error('Could not check the password reset link', error)
    return 'error'
  }
}
