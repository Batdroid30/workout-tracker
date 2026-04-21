'use client'

import { useFormStatus } from 'react-dom'
import { Button } from './Button'
import { ComponentProps } from 'react'
import { Loader2 } from 'lucide-react'

interface SubmitButtonProps extends Omit<ComponentProps<typeof Button>, 'disabled'> {
  pendingText?: string
}

export function SubmitButton({ children, pendingText, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button {...props} disabled={pending} aria-disabled={pending}>
      {pending ? (
        <>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          {pendingText || children}
        </>
      ) : (
        children
      )}
    </Button>
  )
}
