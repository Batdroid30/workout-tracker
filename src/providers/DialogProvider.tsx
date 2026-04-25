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
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center px-4 pb-6 sm:pb-0 bg-[#020617]/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-[#0c1324] border border-[#334155] p-6 rounded-2xl shadow-2xl w-full max-w-sm animate-in zoom-in-95 slide-in-from-bottom-4 duration-200">
            <h3 className="text-base font-black uppercase tracking-tight text-white mb-1.5">{options.title}</h3>
            <p className="text-[#4a5568] mb-6 text-sm font-body leading-relaxed">{options.description}</p>

            <div className="flex gap-2 justify-end">
              {type === 'confirm' && (
                <button
                  onClick={handleCancel}
                  className="px-4 py-2.5 text-xs font-black text-[#adb4ce] hover:bg-[#151b2d] rounded-xl transition-colors uppercase tracking-widest"
                >
                  {options.cancelText || 'Cancel'}
                </button>
              )}
              <button
                onClick={handleConfirm}
                className={`px-5 py-2.5 text-xs font-black rounded-xl transition-colors uppercase tracking-widest ${
                  options.danger
                    ? 'bg-red-500 hover:bg-red-600 text-white'
                    : 'bg-[#CCFF00] hover:bg-[#abd600] text-[#020617]'
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
