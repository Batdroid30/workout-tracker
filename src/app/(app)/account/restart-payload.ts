export type RestartKind = 'cycle' | 'phase'

// Restarting the phase is a fresh block, so the weekly cycle restarts with it.
export function restartPayload(kind: RestartKind, now: Date): { cycle_started_at: string; phase_started_at?: string } {
  const timestamp = now.toISOString()
  return kind === 'phase'
    ? { cycle_started_at: timestamp, phase_started_at: timestamp }
    : { cycle_started_at: timestamp }
}
