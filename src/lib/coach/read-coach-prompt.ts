const MAX_PROMPT_LENGTH = 1000

/**
 * Reads the `?prompt=` deep link for the coach.
 * Next has already decoded search params, so the value is used as-is:
 * decoding again throws on any literal "%" (stalled-lift prompts contain one).
 */
export function readCoachPrompt(prompt: string | string[] | undefined): string | undefined {
  const value = Array.isArray(prompt) ? prompt[0] : prompt
  const trimmed = value?.trim()
  if (!trimmed) return undefined
  return trimmed.slice(0, MAX_PROMPT_LENGTH)
}
