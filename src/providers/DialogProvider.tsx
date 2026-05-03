'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'

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
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 backdrop-blur-sm animate-in fade-in duration-200"
          style={{ background: 'rgba(6,7,13,0.80)' }}
        >
          <div
            className="p-6 rounded-[var(--radius-card)] shadow-2xl w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-200"
            style={{ background: 'rgba(10,13,24,0.98)', border: '1px solid var(--glass-border)' }}
          >
            <h3
              className="text-base font-semibold uppercase tracking-tight mb-1.5"
              style={{ color: 'var(--text-hi)' }}
            >
              {options.title}
            </h3>
            <p className="t-caption mb-6 leading-relaxed">{options.description}</p>

            <div className="flex gap-2 justify-end">
              {type === 'confirm' && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 text-xs font-medium rounded-[var(--radius-inner)] transition-all hover:opacity-80 uppercase tracking-widest"
                  style={{ color: 'var(--text-mid)', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)' }}
                >
                  {options.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className="px-5 py-2.5 text-xs font-semibold rounded-[var(--radius-inner)] transition-all hover:opacity-90 uppercase tracking-widest"
                style={options.danger
                  ? { background: 'rgb(239,68,68)', color: '#fff' }
                  : { background: 'var(--accent)',  color: 'var(--accent-on)' }
                }
              >
                {options.confirmText || 'OK'}
              </button>
            </div>
          </div>
        </div>
      )}
    </DialogContext.Provider>
  )
}
