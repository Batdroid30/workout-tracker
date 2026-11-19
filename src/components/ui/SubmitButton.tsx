'use client'

import { useFormStatus } from 'react-dom'
import { Button, ButtonProps } from './Button'

export type SubmitButtonProps = Omit<ButtonProps, 'loading'> & {
  pendingText?: string
}

export function SubmitButton({ children, pendingText, ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus()

  return (
    <Button {...props} loading={pending}>
      {pending ? pendingText ?? children : children}
    </Button>
  )
}
