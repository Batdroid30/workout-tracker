import { describe, it, expect } from 'vitest'
import { COACH_TOOLS } from './tools'

// Strict mode rejects a schema unless every object closes its properties and
// lists what is required, and it rejects numeric and length limits.
function schemaProblems(schema: unknown, path: string): string[] {
  if (Array.isArray(schema)) return schema.flatMap((item, index) => schemaProblems(item, `${path}[${index}]`))
  if (typeof schema !== 'object' || schema === null) return []

  const problems: string[] = []
  const node = Object.fromEntries(Object.entries(schema))
  if (node.type === 'object') {
    if (node.additionalProperties !== false) problems.push(`${path}: additionalProperties must be false`)
    if (!Array.isArray(node.required)) problems.push(`${path}: required is missing`)
  }
  for (const banned of ['minimum', 'maximum', 'minLength', 'maxLength', 'minItems', 'maxItems']) {
    if (banned in node) problems.push(`${path}: ${banned} is not allowed in strict mode`)
  }
  return [
    ...problems,
    ...Object.entries(node).flatMap(([key, value]) => schemaProblems(value, `${path}.${key}`)),
  ]
}

describe('COACH_TOOLS', () => {
  it('lists the two lookups, then the five proposals, in a fixed order', () => {
    expect(COACH_TOOLS.map(tool => tool.name)).toEqual([
      'find_exercises',
      'get_routines',
      'propose_swap',
      'propose_reorder',
      'propose_new_exercise',
      'propose_routine',
      'propose_split',
    ])
  })

  it('gives every tool a schema strict mode accepts', () => {
    for (const tool of COACH_TOOLS) {
      expect(schemaProblems(tool.input_schema, tool.name)).toEqual([])
    }
  })

  // The API refuses a request whose strict tools compile to too large a
  // grammar. The nested proposal schemas are checked by Zod instead.
  it('keeps only the small tools strict', () => {
    const strictTools = COACH_TOOLS.filter(tool => tool.strict).map(tool => tool.name)
    expect(strictTools).toEqual(['find_exercises', 'get_routines', 'propose_swap', 'propose_reorder'])
  })
})
