import { z } from 'zod'

export const MAX_SPLIT_ITEMS = 14

export const SplitInputSchema = z.object({
  name: z.string().trim().min(1, 'Give your split a name').max(60, 'Keep the name under 60 characters'),
  items: z
    .array(z.object({ routineId: z.string().uuid().nullable() }))
    .min(1, 'Add at least one routine')
    .max(MAX_SPLIT_ITEMS, `A split can have up to ${MAX_SPLIT_ITEMS} days`)
    .refine(items => items.some(item => item.routineId !== null), 'Add at least one routine'),
})

export type SplitInput = z.infer<typeof SplitInputSchema>

export const SplitIdSchema = z.string().uuid()
export const PositionSchema = z.number().int().min(0).max(MAX_SPLIT_ITEMS - 1)
