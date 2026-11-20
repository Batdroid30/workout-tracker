'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import { Button } from '@/components/ui'

interface DialogOptions {
  title: string
  description: string
  confirmText?: string
  cancelText?: string
  danger?: boolean
}

interface DialogContextType {
  confirm: (options: DialogOptions) => Promise<boolean>
  alert: (options: Omit<DialogOptions, 'cancelText'>) => Promise<void>
}

const DialogContext = createContext<DialogContextType | undefined>(undefined)

export function useDialog() {
  const context = useContext(DialogContext)
  if (!context) throw new Error('useDialog must be used within a DialogProvider')
  return context
}

export function DialogProvider({ children }: { children: ReactNode }) {
  const [isOpen, setIsOpen] = useState(false)
  const [options, setOptions] = useState<DialogOptions | null>(null)
  const [type, setType] = useState<'confirm' | 'alert'>('confirm')
  const [resolver, setResolver] = useState<{ resolve: (value: boolean) => void } | null>(null)

  const confirm = (opts: DialogOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setType('confirm')
      setResolver({ resolve })
      setIsOpen(true)
    })
  }

  const alert = (opts: Omit<DialogOptions, 'cancelText'>): Promise<void> => {
    return new Promise((resolve) => {
      setOptions(opts)
      setType('alert')
      setResolver({ resolve: () => resolve() })
      setIsOpen(true)
    })
  }

  const handleConfirm = () => {
    setIsOpen(false)
    if (resolver) resolver.resolve(true)
  }

  const handleCancel = () => {
    setIsOpen(false)
    if (resolver) resolver.resolve(false)
  }

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {isOpen && options && (
        <div
          className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 bg-black/60 animate-in fade-in duration-200"
        >
          <div
            className="p-6 rounded-card bg-surface-raised border border-border shadow-[var(--shadow-overlay)] w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
          >
            <h3 className="t-title-3 mb-1.5">
              {options.title}
            </h3>
            <p className="t-caption mb-6 leading-relaxed">{options.description}</p>

            <div className="flex gap-2 justify-end">
              {type === 'confirm' && (
                <Button onClick={handleCancel} variant="secondary" fullWidth={false}>
                  {options.cancelText || 'Cancel'}
                </Button>
              )}
              <Button
                onClick={handleConfirm}
                variant={options.danger ? 'destructive' : 'primary'}
                fullWidth={false}
              >
                {options.confirmText || 'OK'}
              </Button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
