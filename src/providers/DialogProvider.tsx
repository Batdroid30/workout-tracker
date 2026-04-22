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
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-zinc-900 border border-zinc-800 p-6 rounded-3xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-2">{options.title}</h3>
            <p className="text-zinc-400 mb-6 text-sm">{options.description}</p>
            
            <div className="flex gap-3 justify-end">
              {type === 'confirm' && (
                <button 
                  onClick={handleCancel}
                  className="px-4 py-2 text-sm font-bold text-zinc-400 hover:bg-zinc-800 rounded-xl transition-colors"
                >
                  {options.cancelText || 'Cancel'}
                </button>
              )}
              <button 
                onClick={handleConfirm}
                className={`px-4 py-2 text-sm font-bold rounded-xl transition-colors ${
                  options.danger 
                    ? 'bg-red-500 hover:bg-red-600 text-white' 
                    : 'bg-brand hover:bg-brand-hover text-white'
                }`}
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
