import { cn } from '@/lib/utils'
import { HTMLAttributes } from 'react'

export function Skeleton({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('motion-safe:animate-pulse rounded-field bg-surface-raised', className)}
      {...props}
    />
  )
}
