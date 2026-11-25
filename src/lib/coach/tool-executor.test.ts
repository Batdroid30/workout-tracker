import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/data/exercises', () => ({ getExercises: vi.fn(async () => []) }))
vi.mock('@/lib/coach/tools/read-tools', () => ({
  runReadTool: vi.fn(async () => '{"exercises":[]}'),
  loadRoutinesForCoach: vi.fn(async () => []),
}))
vi.mock('@/lib/coach/tools/propose-tools', () => ({ buildProposal: vi.fn() }))

import { createCoachToolExecutor } from './tool-executor'
import { runReadTool, loadRoutinesForCoach } from '@/lib/coach/tools/read-tools'
import { buildProposal } from '@/lib/coach/tools/propose-tools'
import { getExercises } from '@/lib/data/exercises'
import type { CoachProposal } from '@/lib/coach/proposals'

const proposal: CoachProposal = {
  id: 'p1', status: 'pending', label: 'New routine', kind: 'routine', title: 'Push', notes: null, exercises: [],
}

describe('createCoachToolExecutor', () => {
  beforeEach(() => vi.clearAllMocks())

  it('runs read tools and hands their JSON to the model', async () => {
    const execute = createCoachToolExecutor('user-1')

    const outcome = await execute('find_exercises', { query: 'row' })

    expect(runReadTool).toHaveBeenCalledWith('find_exercises', { query: 'row' }, 'user-1')
    expect(outcome).toEqual({ forModel: '{"exercises":[]}' })
  })

  it('returns a valid proposal with a short confirmation for the model', async () => {
    vi.mocked(buildProposal).mockReturnValue({ proposal })
    const execute = createCoachToolExecutor('user-1')

    const outcome = await execute('propose_routine', { title: 'Push' })

    expect(buildProposal).toHaveBeenCalledWith('propose_routine', { title: 'Push' }, { library: [], routines: [], userId: 'user-1' })
    expect(outcome.proposal).toBe(proposal)
    expect(outcome.isError).toBeUndefined()
    expect(outcome.forModel).toMatch(/Confirm/)
  })

  it('returns a rejected proposal to the model as an error', async () => {
    vi.mocked(buildProposal).mockReturnValue({ error: 'No routine with id "x".' })
    const execute = createCoachToolExecutor('user-1')

    expect(await execute('propose_swap', {})).toEqual({ forModel: 'No routine with id "x".', isError: true })
  })

  it('loads the library and routines once per turn', async () => {
    vi.mocked(buildProposal).mockReturnValue({ proposal })
    const execute = createCoachToolExecutor('user-1')

    await execute('propose_routine', {})
    await execute('propose_split', {})

    expect(getExercises).toHaveBeenCalledTimes(1)
    expect(loadRoutinesForCoach).toHaveBeenCalledTimes(1)
  })

  it('answers an unknown tool with an error', async () => {
    const outcome = await createCoachToolExecutor('user-1')('create_routine', {})

    expect(outcome.isError).toBe(true)
  })
})
