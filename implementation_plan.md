# Personal Coaching & AI Integration Plan

This plan outlines the transformation of the Tracker app into an intelligent coaching platform. We will leverage existing heuristic algorithms (Fatigue assessment, Double progression) and layer on a sophisticated AI (Gemini/Vercel AI SDK) to provide a human-like coaching experience.

## User Review Required

> [!IMPORTANT]
> **AI Choice**: We propose using **Google Gemini** (via Vercel AI SDK) for routine generation and coaching advice. This requires an API key. 
> - **Pro**: High-quality, context-aware coaching.
> - **Alternative**: A purely rule-based system (Faster, free, but less "magical").

> [!NOTE]
> **Database Changes**: We will need to add columns to the `profiles` table:
> - `training_goal`: Strength, Hypertrophy, etc.
> - `training_phase`: Bulking, Cutting, Maingaining.
> - `training_style`: Intensity-based (Low vol/Failure) vs Volume-based (High vol/Sub-failure).
> - `priority_muscles`: List of muscle groups to focus on.

---

## Proposed Features

### 1. The "AI Coach" Engine
Instead of just showing raw data, we will create a `Coach` service that synthesizes data from:
- `assessFatigueLevel()` (Existing)
- `getNeglectedMuscles()` (Existing)
- `getStalledMovements()` (Existing)
- `getVolumeHistory()` (Existing)

**New Component**: `CoachDashboard` — A dedicated view where the AI explains these insights and suggests actions (e.g., "You're showing signs of fatigue, I've adjusted your next session to be a deload").

### 2. Smart Exercise Prediction
- **Logic**: A new utility `predictNextExercise(userId, currentWorkoutId, lastExerciseId)` will:
  1. Check the active Routine for the next scheduled exercise.
  2. If no routine, check history for the most frequent successor of the last exercise.
  3. Offer a "Suggest Next" button in the active workout UI.

### 3. Goal-Driven Rep Ranges
- **Implementation**: 
  - Add `training_goal` ('Strength', 'Hypertrophy', 'Mixed') to the user profile.
  - Modify `suggestNextSet` to use different ranges:
    - **Strength**: 1–5 reps
    - **Hypertrophy**: 8–12 reps
    - **General**: 5–8 reps

### 4. Training Phases (Bulking/Cutting/Maingaining)
- **Phase Logic**:
  - **Bulking**: AI suggests higher volume, more isolation work for priority muscles, and aggressive progressive overload.
  - **Cutting**: AI suggests lower volume, higher intensity (to retain muscle), and more "big rocks" (compounds).
  - **Maingaining**: AI focuses on steady progression and variety to avoid boredom.
- **Muscle Prioritization**: Users select 1-2 muscle groups. The AI will inject extra sets or specific variations for these groups in every routine.

### 5. Training Styles: Intensity vs. Volume
- **Intensity-Based (HIT)**: AI suggests fewer sets (1-2 per exercise), but pushes for RPE 9-10 and incorporates techniques like rest-pause or dropsets.
- **Volume-Based**: AI suggests more sets (3-5), focus on total weekly volume, and keeps RPE around 7-8 to manage recovery.

### 6. Automatic Routine & Deload Generation
- **Automatic Routines**: Use an LLM prompt that includes the user's available equipment, neglected muscles, and training goal.
- **Auto-Deload**: When `assessFatigueLevel` returns "high" confidence, the app will automatically suggest a "Deload Week" routine for the upcoming week.

---

## Proposed Changes

### [Core Logic]

#### [MODIFY] [algorithms.ts](file:///c:/Users/rapty/Documents/Personal%20development/Vibecode/Tracker/workout-tracker/src/lib/algorithms.ts)
- Update `suggestNextSet` to accept a `training_goal`.
- Add `generateDeloadRoutine(originalRoutine)` which clones a routine but halves the volume.

#### [NEW] [coach.ts](file:///c:/Users/rapty/Documents/Personal%20development/Vibecode/Tracker/workout-tracker/src/lib/data/coach.ts)
- Orchestrator that gathers all insights and formats them for the AI prompt.

### [AI Integration]

#### [NEW] [api/chat/route.ts](file:///c:/Users/rapty/Documents/Personal%20development/Vibecode/Tracker/workout-tracker/src/app/api/chat/route.ts)
- Vercel AI SDK route for the coaching chat and routine generation.

#### [NEW] [prompts.ts](file:///c:/Users/rapty/Documents/Personal%20development/Vibecode/Tracker/workout-tracker/src/lib/ai/prompts.ts)
- Curated system prompts for the "Coach" persona.

### [Database & Profile]

#### [MODIFY] [schema.sql](file:///c:/Users/rapty/Documents/Personal%20development/Vibecode/Tracker/workout-tracker/supabase/migrations/20240427_add_coaching_fields.sql)
- Add `training_goal`, `experience_level`, and `deload_week_start` to `profiles`.

---

## Verification Plan

### Automated Tests
- Unit tests for the prediction logic (testing successor frequency).
- Validation of the deload routine generator (ensuring sets/reps are actually reduced).

### Manual Verification
1.  **Simulate Fatigue**: Manually set high RPEs in history and check if the Coach suggests a deload.
2.  **Predict Next**: Start a workout from a routine, finish one exercise, and see if the correct next exercise is predicted.
3.  **AI Routine**: Use the "Generate Routine" feature and verify it targets neglected muscles.
