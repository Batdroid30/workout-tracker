import { describe, it, expect, beforeEach } from 'vitest'
import { usePRStore } from './pr.store'
import type { PersonalRecord } from '@/types/database'

const pr = (pr_type: PersonalRecord['pr_type'], value: number) => ({ exercise_id: 'ex-1', pr_type, value }) as PersonalRecord

describe('checkLocalPR', () => {
  beforeEach(() => {
    usePRStore.setState({ prs: {}, newPRs: [] })
  })

  it('flags lower assistance as a PR for assisted exercises', () => {
    usePRStore.setState({ prs: { 'ex-1': [pr('best_weight', 30)] } })

    const results = usePRStore.getState().checkLocalPR('ex-1', 'Pull Up (Assisted)', 25, 8)

    expect(results).toEqual([{ pr_type: 'best_weight', old_value: 30, new_value: 25, is_pr: true }])
  })

  it('does not flag higher assistance, 1RM or volume for assisted exercises', () => {
    usePRStore.setState({ prs: { 'ex-1': [pr('best_weight', 25)] } })

    expect(usePRStore.getState().checkLocalPR('ex-1', 'Pull Up (Assisted)', 30, 12)).toEqual([])
  })

  it('compares the next set against the new assisted bar', () => {
    usePRStore.setState({ prs: { 'ex-1': [pr('best_weight', 30)] } })
    const { checkLocalPR } = usePRStore.getState()

    checkLocalPR('ex-1', 'Pull Up (Assisted)', 25, 8)

    expect(usePRStore.getState().checkLocalPR('ex-1', 'Pull Up (Assisted)', 27.5, 8)).toEqual([])
  })

  it('keeps higher-is-better for normal exercises', () => {
    usePRStore.setState({ prs: { 'ex-1': [pr('best_weight', 100), pr('best_volume', 500), pr('best_1rm', 112)] } })

    const types = usePRStore.getState().checkLocalPR('ex-1', 'Bench Press', 105, 5).map(r => r.pr_type)

    expect(types).toEqual(['best_weight', 'best_volume', 'best_1rm'])
  })
})
