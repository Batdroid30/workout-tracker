import type { ApplyDeps } from '@/lib/coach/apply-proposal'
import { DatabaseError } from '@/lib/errors'
import { deleteCustomExercise, getExercises, insertCustomExercise } from '@/lib/data/exercises'
import { createRoutine, deleteRoutine, getOwnedRoutine, updateRoutine } from '@/lib/data/routines'
import { activateSplit, createSplit, deleteSplit } from '@/lib/data/splits'

// getExercises logs and returns [] on a failed read. The built-in catalogue is
// never empty, so an empty result means the read failed, and trusting it would
// let a duplicate name or an unusable exercise slip past the checks.
async function loadLibrary() {
  const library = await getExercises()
  if (library.length === 0) throw new DatabaseError('Exercise library unavailable')
  return library
}

// The real data layer behind applyProposal, every call scoped to the caller.
export function buildApplyDeps(userId: string): ApplyDeps {
  return {
    userId,
    getRoutine:     routineId => getOwnedRoutine(routineId, userId),
    getLibrary:     loadLibrary,
    updateRoutine:  (routineId, input) => updateRoutine(routineId, userId, input),
    createRoutine:  async input => ({ id: (await createRoutine(userId, input)).id }),
    deleteRoutine:  routineId => deleteRoutine(routineId, userId),
    createExercise: exercise => insertCustomExercise(userId, exercise),
    deleteExercise: exerciseId => deleteCustomExercise(exerciseId, userId),
    saveSplit:      async input => ({ id: await createSplit(userId, input) }),
    deleteSplit:    splitId => deleteSplit(splitId, userId),
    setActiveSplit: splitId => activateSplit(splitId, userId),
  }
}
