'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { importHevyCSVAction, recalculatePRsAfterImportAction } from './actions'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui'

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
        <h1 className="t-display-l">Import data</h1>
        <p className="t-caption">
          Upload your workout data from other apps. Currently supporting Hevy CSV exports.
        </p>
      </div>

      <div className="card p-6 space-y-6">
        {!isUploading && !result && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center w-full h-48 rounded-control border-2 border-dashed border-border-strong cursor-pointer transition-all group hover:opacity-90"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-tertiary transition-colors" />
                  <p className="mb-2 text-sm font-medium text-secondary">
                    <span className="text-primary underline">Click to upload</span> or drag and drop
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
                <div className="flex items-center gap-3 p-3 rounded-control bg-surface-raised border border-border">
                  <FileText className="w-5 h-5 shrink-0 text-secondary" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate text-primary">
                      {file.name}
                    </p>
                    <p className="t-caption">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-xs font-medium text-tertiary transition-colors hover:text-primary min-h-10 px-2"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <Button type="submit" disabled={!file || isUploading}>
              Start import
            </Button>
          </form>
        )}

        {isUploading && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16">
                <Loader2 className="w-16 h-16 animate-spin opacity-20 text-primary" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-semibold text-primary">
                    {Math.round(progress)}%
                  </span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-semibold text-primary">
                  {phaseMessage}
                </p>
                <p className="t-caption">This may take a few minutes for large files</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 w-full rounded-pill overflow-hidden bg-surface-raised border border-border">
                <div
                  className="h-full transition-all duration-500 ease-out rounded-pill bg-primary"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center gap-3 text-xs font-medium text-tertiary">
                <span className="shrink-0">Status: Processing</span>
                <span className="truncate">{file?.name}</span>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div
            className={`p-4 rounded-control ${result.success ? 'bg-positive-soft' : 'bg-negative-soft'}`}
          >
            <div className="flex gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-positive" />
              ) : (
                <AlertCircle className="w-5 h-5 text-negative shrink-0" />
              )}
              <div className="space-y-1 min-w-0">
                <p
                  className={`text-sm font-semibold ${result.success ? 'text-positive' : 'text-negative'}`}
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
            <Button
              variant="secondary"
              size="sm"
              className="mt-4"
              onClick={() => result.success ? router.push('/dashboard') : setResult(null)}
            >
              {result.success ? 'Go to dashboard' : 'Try again'}
            </Button>
          </div>
        )}
      </div>

      <div className="card p-6">
        <h3 className="t-label mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-tertiary" />
          How to get your Hevy CSV
        </h3>
        <ol className="t-caption space-y-2 list-decimal list-inside leading-relaxed">
          <li>Open the Hevy app on your phone</li>
          <li>Go to your <span className="text-primary">Profile</span> tab</li>
          <li>Tap the <span className="text-primary">Settings</span> icon (top right)</li>
          <li>Scroll down to <span className="text-primary">Export &amp; Import Data</span></li>
          <li>Select <span className="text-primary">Export Workouts (CSV)</span></li>
          <li>Send the file to your computer and upload it here</li>
        </ol>
      </div>
    </div>
  )
}
