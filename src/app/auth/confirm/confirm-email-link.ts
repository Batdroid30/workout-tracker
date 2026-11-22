import { z } from 'zod'

// Only password reset links come through here; other email types are refused.
const ResetLinkSchema = z.object({
  token_hash: z.string().min(1),
  type: z.literal('recovery'),
})

type VerifyOtp = (params: { type: 'recovery'; token_hash: string }) => Promise<{ error: unknown }>

export const BAD_LINK_PATH = `/forgot-password?${new URLSearchParams({
  error: 'That reset link has expired or was already used. Request a new one.',
})}`

// Checks the one-time token from the email on the server. Unlike the default
// link, it needs nothing stored in the browser that asked for the reset, so it
// works wherever the email is opened. Returns where to send the lifter next.
export async function confirmEmailLink(searchParams: URLSearchParams, verifyOtp: VerifyOtp): Promise<string> {
  const link = ResetLinkSchema.safeParse(Object.fromEntries(searchParams))
  if (!link.success) return BAD_LINK_PATH

  try {
    const { error } = await verifyOtp(link.data)
    if (error) {
      console.error('Password reset link was rejected', error)
      return BAD_LINK_PATH
    }
    return '/reset-password'
  } catch (error: unknown) {
    console.error('Could not check the password reset link', error)
    return BAD_LINK_PATH
  }
}
