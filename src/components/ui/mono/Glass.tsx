import { forwardRef, type HTMLAttributes } from 'react'
import { cn } from '@/lib/utils'

interface GlassProps extends HTMLAttributes<HTMLDivElement> {
  strong?: boolean
  as?: 'div' | 'section' | 'article' | 'aside'
}

export const Glass = forwardRef<HTMLDivElement, GlassProps>(function Glass(
  { strong = false, as: Tag = 'div', className, children, ...rest },
  ref,
) {
  return (
    <Tag
      ref={ref}
      className={cn('glass', strong && 'glass-strong', className)}
      {...rest}
    >
      {children}
    </Tag>
  )
})
