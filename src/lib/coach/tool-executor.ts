import { getExercises } from '@/lib/data/exercises'
import { loadRoutinesForCoach, runReadTool } from '@/lib/coach/tools/read-tools'
import { buildProposal, type ProposeToolName, type ProposeWorld } from '@/lib/coach/tools/propose-tools'
import type { ToolOutcome } from '@/lib/coach/coach-turn'

type ReadToolName = 'find_exercises' | 'get_routines'

const READ_TOOL_NAMES: readonly ReadToolName[] = ['find_exercises', 'get_routines']
const PROPOSE_TOOL_NAMES: readonly ProposeToolName[] = [
  'propose_swap',
  'propose_reorder',
  'propose_new_exercise',
  'propose_routine',
  'propose_split',
]

const PROPOSAL_SHOWN = 'Proposal shown to the lifter as a card. Nothing has changed yet: they tap Confirm to apply it or Not now to drop it. Do not say it is done.'

function isReadTool(name: string): name is ReadToolName {
  return READ_TOOL_NAMES.some(readName => readName === name)
}

function isProposeTool(name: string): name is ProposeToolName {
  return PROPOSE_TOOL_NAMES.some(proposeName => proposeName === name)
}

// One executor per coach turn. Proposals are validated against the library
// and routines as they were when the turn began; nothing writes during a turn,
// so they are loaded once, on the first proposal.
export function createCoachToolExecutor(userId: string): (name: string, input: unknown) => Promise<ToolOutcome> {
  let world: Promise<ProposeWorld> | null = null
  const loadWorld = () => {
    world ??= Promise.all([getExercises(), loadRoutinesForCoach(userId)])
      .then(([library, routines]) => ({ library, routines, userId }))
    return world
  }

  return async (name, input) => {
    if (isReadTool(name)) return { forModel: await runReadTool(name, input, userId) }
    if (!isProposeTool(name)) return { forModel: `Unknown tool: ${name}`, isError: true }

    const result = buildProposal(name, input, await loadWorld())
    if ('error' in result) return { forModel: result.error, isError: true }
    return { forModel: PROPOSAL_SHOWN, proposal: result.proposal }
  }
}
