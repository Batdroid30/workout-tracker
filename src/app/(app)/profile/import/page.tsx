'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { importHevyCSVAction, recalculatePRsAfterImportAction } from './actions'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const IMPORT_PHASES = [
  { threshold: 15,  message: 'Parsing CSV data...'    },
  { threshold: 40,  message: 'Matching exercises...'  },
  { threshold: 68,  message: 'Importing workouts...'  },
  { threshold: 95,  message: 'Recalculating PRs...'   },
  { threshold: 100, message: 'Finalizing...'           },
]

export default function ImportPage() {
  const [file,          setFile]          = useState<File | null>(null)
  const [isUploading,   setIsUploading]   = useState(false)
  const [progress,      setProgress]      = useState(0)
  const [phaseMessage,  setPhaseMessage]  = useState('')
  const [result,        setResult]        = useState<{
    success: boolean; count?: number; skipped?: number; error?: string; errors?: string[]
  } | null>(null)
  const router = useRouter()

  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isUploading) {
      setProgress(0)
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 98) return prev
          const increment = prev < 40 ? 2 : prev < 70 ? 1 : 0.5
          return prev + increment
        })
      }, 500)
    } else {
      setProgress(0)
    }
    return () => clearInterval(interval)
  }, [isUploading])

  useEffect(() => {
    if (isUploading) {
      const phase = IMPORT_PHASES.find(p => progress <= p.threshold)
      if (phase) setPhaseMessage(phase.message)
    } else {
      setPhaseMessage('')
    }
  }, [progress, isUploading])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    setIsUploading(true)
    setResult(null)

    const formData = new FormData()
    formData.append('file', file)

    try {
      const importRes = await importHevyCSVAction(formData)

      if (!importRes.success) {
        setResult(importRes)
        return
      }

      setProgress(72)
      const prRes = await recalculatePRsAfterImportAction()

      setFile(null)
      setProgress(100)
      setResult({
        success: true,
        count:   importRes.count,
        skipped: importRes.skipped,
        errors:  [
          ...(importRes.errors ?? []),
          ...(!prRes.success ? ['PR recalculation failed — your personal records may not be up to date'] : []),
        ],
      })
    } catch {
      setResult({ success: false, error: 'An unexpected error occurred' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <div className="space-y-2">
        <h1 className="t-display-l">Import Data</h1>
        <p className="t-caption">
          Upload your workout data from other apps. Currently supporting Hevy CSV exports.
        </p>
      </div>

      <div className="glass p-6 space-y-6">
        {!isUploading && !result && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center w-full h-48 rounded-[var(--radius-inner)] cursor-pointer transition-all group hover:opacity-90"
                style={{
                  border: '2px dashed var(--glass-border)',
                }}
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload
                    className="w-10 h-10 mb-3 transition-colors"
                    style={{ color: 'var(--text-faint)' }}
                  />
                  <p className="mb-2 text-sm font-medium uppercase tracking-tight" style={{ color: 'var(--text-mid)' }}>
                    <span style={{ color: 'var(--accent)' }}>Click to upload</span> or drag and drop
                  </p>
                  <p className="t-label">Hevy CSV export file</p>
                </div>
                <input
                  id="csv-upload"
                  type="file"
                  className="hidden"
                  accept=".csv"
                  onChange={handleFileChange}
                />
              </label>

              {file && (
                <div
                  className="flex items-center gap-3 p-3 rounded-[var(--radius-inner)]"
                  style={{ background: 'var(--bg-1)', border: '1px solid var(--glass-border)' }}
                >
                  <FileText className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-xs font-medium truncate uppercase tracking-tight"
                      style={{ color: 'var(--text-hi)' }}
                    >
                      {file.name}
                    </p>
                    <p className="t-caption">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-[10px] font-medium uppercase tracking-widest transition-colors hover:opacity-80"
                    style={{ color: 'var(--text-faint)' }}
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full h-12 rounded-[var(--radius-pill)] font-semibold uppercase tracking-widest transition-all active:scale-[0.98] hover:opacity-90 disabled:opacity-30 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{ background: 'var(--accent)', color: 'var(--accent-on)' }}
            >
              Start Import
            </button>
          </form>
        )}

        {isUploading && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16">
                <Loader2 className="w-16 h-16 animate-spin opacity-20" style={{ color: 'var(--accent)' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold" style={{ color: 'var(--accent)' }}>
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p
                  className="text-sm font-semibold uppercase tracking-widest"
                  style={{ color: 'var(--text-hi)' }}
                >
                  {phaseMessage}
                </p>
                <p className="t-caption uppercase tracking-tight">This may take a few minutes for large files</p>
              </div>
            </div>

            <div className="space-y-2">
              <div
                className="h-2 w-full rounded-full overflow-hidden"
                style={{ background: 'var(--bg-1)', border: '1px solid var(--glass-border)' }}
              >
                <div
                  className="h-full transition-all duration-500 ease-out rounded-full"
                  style={{ width: `${progress}%`, background: 'var(--accent)' }}
                />
              </div>
              <div
                className="flex justify-between items-center text-[9px] font-medium uppercase tracking-widest"
                style={{ color: 'var(--text-faint)' }}
              >
                <span>Status: Processing</span>
                <span>{file?.name}</span>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div
            className="p-4 rounded-[var(--radius-inner)]"
            style={result.success
              ? { background: 'var(--accent-soft)', border: '1px solid var(--accent-line)' }
              : { background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.20)' }
            }
          >
            <div className="flex gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: 'var(--accent)' }} />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
              )}
              <div className="space-y-1">
                <p
                  className="text-[11px] font-semibold uppercase tracking-widest"
                  style={{ color: result.success ? 'var(--accent)' : '#f87171' }}
                >
                  {result.success
                    ? `Imported ${result.count} workout${result.count !== 1 ? 's' : ''}${result.skipped ? ` · ${result.skipped} already existed` : ''}`
                    : 'Import failed'}
                </p>
                {result.error && <p className="t-caption">{result.error}</p>}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="t-label">Some workouts could not be imported:</p>
                    <ul className="t-caption list-disc list-inside max-h-32 overflow-y-auto">
                      {result.errors.map((err, i) => <li key={i}>{err}</li>)}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            <button
              onClick={() => result.success ? router.push('/dashboard') : setResult(null)}
              className="mt-4 w-full h-10 rounded-[var(--radius-inner)] text-[10px] font-medium uppercase tracking-widest transition-all hover:opacity-80"
              style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid var(--glass-border)', color: 'var(--text-mid)' }}
            >
              {result.success ? 'Go to Dashboard' : 'Try Again'}
            </button>
          </div>
        )}
      </div>

      <div className="glass p-6">
        <h3 className="t-label mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" style={{ color: 'var(--text-faint)' }} />
          How to get your Hevy CSV
        </h3>
        <ol className="t-caption space-y-2 list-decimal list-inside leading-relaxed">
          <li>Open the Hevy app on your phone</li>
          <li>Go to your <span style={{ color: 'var(--text-hi)' }}>Profile</span> tab</li>
          <li>Tap the <span style={{ color: 'var(--text-hi)' }}>Settings</span> icon (top right)</li>
          <li>Scroll down to <span style={{ color: 'var(--text-hi)' }}>Export &amp; Import Data</span></li>
          <li>Select <span style={{ color: 'var(--text-hi)' }}>Export Workouts (CSV)</span></li>
          <li>Send the file to your computer and upload it here</li>
        </ol>
      </div>
    </div>
  )
}
