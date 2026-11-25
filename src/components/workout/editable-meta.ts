export interface EditableMeta {
  title: string
  minutes: number
  notes: string
}

// What the edit-details form starts from: the workout as saved right now.
export function editableMeta(title: string | null, durationSeconds: number | null, notes: string | null): EditableMeta {
  return {
    title: title ?? '',
    minutes: durationSeconds ? Math.floor(durationSeconds / 60) : 0,
    notes: notes ?? '',
  }
}
