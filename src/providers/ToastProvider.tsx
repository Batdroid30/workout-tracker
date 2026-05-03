'use client'

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { CheckCircle2, XCircle, Info, X } from 'lucide-react'
import { cn } from '@/lib/utils'

// ─── Types ────────────────────────────────────────────────────────────────────

type ToastType = 'success' | 'error' | 'info'

interface ToastAction {
  label: string
  onClick: () => void
}

interface Toast {
  id: string
  type: ToastType
  message: string
  duration: number
  action?: ToastAction
}

interface ToastOptions {
  duration?: number
  action?: ToastAction
}

interface ToastContextType {
  success: (message: string, options?: ToastOptions) => void
  error:   (message: string, options?: ToastOptions) => void
  info:    (message: string, options?: ToastOptions) => void
  dismiss: (id: string) => void
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used within ToastProvider')
  return ctx
}

// ─── Single toast item ────────────────────────────────────────────────────────

const TOAST_ICONS: Record<ToastType, React.ReactNode> = {
  success: <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: 'var(--accent)' }} />,
  error:   <XCircle      className="w-4 h-4 shrink-0 text-red-400" />,
  info:    <Info         className="w-4 h-4 shrink-0" style={{ color: 'var(--text-mid)' }} />,
}

interface ToastItemProps {
  toast: Toast
  onDismiss: (id: string) => void
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const show = requestAnimationFrame(() => setVisible(true))
    return () => cancelAnimationFrame(show)
  }, [])

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => onDismiss(toast.id), 300)
    }, toast.duration)
    return () => clearTimeout(timer)
  }, [toast.id, toast.duration, onDismiss])

  const handleDismiss = () => {
    setVisible(false)
    setTimeout(() => onDismiss(toast.id), 300)
  }

  const handleAction = () => {
    toast.action?.onClick()
    handleDismiss()
  }

  const borderColor =
    toast.type === 'success' ? 'var(--accent-line)' :
    toast.type === 'error'   ? 'rgba(239,68,68,0.30)' :
    'var(--glass-border)'

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 rounded-[var(--radius-inner)] shadow-2xl',
        'transition-all duration-300 ease-out',
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4',
      )}
      style={{
        background: 'rgba(10,13,24,0.97)',
        backdropFilter: 'blur(20px)',
        border: `1px solid ${borderColor}`,
      }}
    >
      {TOAST_ICONS[toast.type]}

      <p className="flex-1 text-sm font-medium leading-snug" style={{ color: 'var(--text-hi)' }}>
        {toast.message}
      </p>

      {toast.action && (
        <button
          onClick={handleAction}
          className="shrink-0 text-xs font-semibold uppercase tracking-widest transition-colors px-1 hover:opacity-80"
          style={{ color: 'var(--accent)' }}
        >
          {toast.action.label}
        </button>
      )}

      <button
        onClick={handleDismiss}
        className="shrink-0 transition-colors hover:opacity-70"
        style={{ color: 'var(--text-faint)' }}
        aria-label="Dismiss"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const counterRef = useRef(0)

  const add = useCallback((type: ToastType, message: string, options: ToastOptions = {}) => {
    const id = `toast-${++counterRef.current}`
    setToasts(prev => [...prev, {
      id,
      type,
      message,
      duration: options.duration ?? 3500,
      action: options.action,
    }])
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const value: ToastContextType = {
    success: (msg, opts) => add('success', msg, opts),
    error:   (msg, opts) => add('error',   msg, opts),
    info:    (msg, opts) => add('info',    msg, opts),
    dismiss,
  }

  return (
    <ToastContext.Provider value={value}>
      {children}

      {toasts.length > 0 && (
        <div
          aria-live="polite"
          aria-atomic="false"
          className="fixed bottom-20 left-0 right-0 z-50 flex flex-col gap-2 px-4 pointer-events-none"
        >
          {toasts.map(t => (
            <div key={t.id} className="pointer-events-auto">
              <ToastItem toast={t} onDismiss={dismiss} />
            </div>
          ))}
        </div>
      )}
    </ToastContext.Provider>
  )
}
