import { HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

const CARD_PADDING = {
  md: 'p-4',
  none: '',
} as const

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  as?: 'div' | 'section' | 'article'
  padding?: keyof typeof CARD_PADDING
}

export function Card({ as: Component = 'div', padding = 'md', className, ...props }: CardProps) {
  return <Component className={cn('card', CARD_PADDING[padding], className)} {...props} />
}
