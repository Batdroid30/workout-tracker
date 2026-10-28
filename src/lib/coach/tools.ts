import type { Tool } from '@anthropic-ai/sdk/resources/messages'

export const COACH_TOOLS: Tool[] = [
  {
    name: 'create_routine',
    description: 'Propose and generate a structured workout routine for the user. Call this whenever the user asks for a workout plan, routine, split, or deload day.',
    input_schema: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Descriptive title for the routine, e.g. "Upper Body Strength" or "Leg Hypertrophy Focus"',
        },
        notes: {
          type: 'string',
          description: 'Brief coaching notes on rest times, warmup, or intent',
        },
        exercises: {
          type: 'array',
          description: 'Ordered list of exercises in the routine',
          items: {
            type: 'object',
            properties: {
              exercise_name: {
                type: 'string',
                description: 'Exact or common name of the exercise (e.g. "Barbell Bench Press", "Romanian Deadlift", "Pull-up")',
              },
              target_sets: {
                type: 'number',
                description: 'Number of working sets (typically 2 to 5)',
              },
              target_reps: {
                type: 'number',
                description: 'Target reps per set according to their WUP phase (e.g. 5 for strength, 10 for hypertrophy)',
              },
              progression_model: {
                type: 'string',
                enum: ['double', 'rep_sum'],
                description: '"double" for standard weight+rep progression, "rep_sum" for rep bank progression',
              },
              rep_sum_target: {
                type: 'number',
                description: 'Only required if progression_model is rep_sum (e.g. 25 total reps)',
              },
            },
            required: ['exercise_name', 'target_sets', 'target_reps'],
          },
        },
      },
      required: ['title', 'exercises'],
    },
  },
  {
    name: 'suggest_exercise_swap',
    description: 'Suggest alternative exercises when user lacks equipment or experiences joint discomfort.',
    input_schema: {
      type: 'object',
      properties: {
        current_exercise: {
          type: 'string',
          description: 'Exercise name being replaced',
        },
        reason: {
          type: 'string',
          description: 'Reason for replacement (e.g. "no barbell", "shoulder pain", "home gym with dumbbells only")',
        },
      },
      required: ['current_exercise', 'reason'],
    },
  },
]
