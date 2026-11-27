export type WeekKind = 'strength' | 'hypertrophy' | 'volume'
export type EffortSource = 'entered' | 'inferred' | 'assumed'
export type EquipmentKind = 'barbell' | 'ez-bar' | 'dumbbell' | 'cable' | 'machine' | 'bodyweight' | 'other'
export type SetRole = 'straight' | 'top' | 'backoff'
export type RpeSource = 'entered' | 'prompt' | null

export interface LoggedSet {
  weightKg: number; reps: number; rpe: number | null; rpeSource: RpeSource
  suggestedWeightKg: number | null; suggestedReps: number | null
}
export interface PastSession {
  workoutId: string; startedAt: string
  weekKind: WeekKind | null; isDeload: boolean
  bodyweightKg: number         // bodyweight the session was logged against
  sets: LoggedSet[]            // working sets only, ordered by set_number, load space
}
export interface RepRange { min: number; max: number }
export interface PlanContext {
  weekKind: WeekKind; repRange: RepRange; rpeTarget: number; isDeloadWeek: boolean
  phase: 'bulking' | 'cutting' | 'maingaining' | null
  experience: 'beginner' | 'intermediate' | 'advanced' | null
  movement: 'compound' | 'isolation'; equipment: EquipmentKind
  weightStepKg: number; isBodyweightOnly: boolean
  plannedSets: number; readinessAverage: number | null
}
export interface SetSuggestion {
  weightKg: number; reps: number; repsMax: number | null   // repsMax set → show "reps–repsMax"
  rpeTarget: number; role: SetRole; optional: boolean
}
export type PlanRule =
  | 'weight-up' | 'weight-up-forced' | 'hold-add-reps' | 'hold-match' | 'come-down'
  | 'stall-reset' | 'reps-only' | 'calibration' | 'top-set-up' | 'top-set-hold' | 'deload'
export type PlanModifier = 'cut' | 'low-readiness' | 'stall-reset'
export interface PlanExplanation {
  rule: PlanRule; referenceDate: string | null; referenceSets: LoggedSet[]
  effortSources: EffortSource[]; modifiers: PlanModifier[]
  confidence: 'high' | 'medium' | 'low'; reason: string
}
export interface ExercisePlan { sets: SetSuggestion[]; explanation: PlanExplanation }
