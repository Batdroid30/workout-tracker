// Runs a server action from a button so a failure shows a message instead of
// escaping to the page's error boundary. Returns whether it succeeded.
export async function runAction(
  action: () => Promise<unknown>,
  onError: (message: string) => void,
): Promise<boolean> {
  try {
    await action()
    return true
  } catch (error: unknown) {
    onError(error instanceof Error ? error.message : 'Something went wrong. Please try again.')
    return false
  }
}
