'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { importHevyCSVAction } from './actions'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

const IMPORT_PHASES = [
  { threshold: 15, message: 'Parsing CSV data...' },
  { threshold: 40, message: 'Matching exercises...' },
  { threshold: 75, message: 'Importing workouts...' },
  { threshold: 95, message: 'Recalculating PRs...' },
  { threshold: 100, message: 'Finalizing...' },
]

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [progress, setProgress] = useState(0)
  const [phaseMessage, setPhaseMessage] = useState('')
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string; errors?: string[] } | null>(null)
  const router = useRouter()

  // Progress simulation
  useEffect(() => {
    let interval: NodeJS.Timeout
    if (isUploading) {
      setProgress(0)
      interval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 98) return prev
          // Slow down as it gets closer to 100
          const increment = prev < 40 ? 2 : prev < 70 ? 1 : 0.5
          return prev + increment
        })
      }, 500)
    } else {
      setProgress(0)
    }
    return () => clearInterval(interval)
  }, [isUploading])

  // Update phase message based on progress
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
      const res = await importHevyCSVAction(formData)
      setResult(res)
      if (res.success) {
        setFile(null)
        setProgress(100)
      }
    } catch (error: any) {
      setResult({ success: false, error: 'An unexpected error occurred' })
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-white uppercase">Import Data</h1>
        <p className="text-[#4a5568] text-sm font-body">
          Upload your workout data from other apps. Currently supporting Hevy CSV exports.
        </p>
      </div>

      <div className="glass-panel border border-[#334155] rounded-xl p-6 space-y-6">
        {!isUploading && !result && (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-4">
              <label
                htmlFor="csv-upload"
                className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-[#334155] rounded-xl cursor-pointer hover:bg-[#CCFF00]/5 hover:border-[#CCFF00]/30 transition-all group"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <Upload className="w-10 h-10 mb-3 text-[#334155] group-hover:text-[#CCFF00] transition-colors" />
                  <p className="mb-2 text-sm text-[#adb4ce] font-bold uppercase tracking-tight">
                    <span className="text-[#CCFF00]">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-[10px] text-[#4a5568] uppercase font-black tracking-widest">Hevy CSV export file</p>
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
                <div className="flex items-center gap-3 p-3 bg-[#0c1324] border border-[#334155] rounded-xl">
                  <FileText className="w-5 h-5 text-[#CCFF00]" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-black text-white truncate uppercase tracking-tight">{file.name}</p>
                    <p className="text-[10px] text-[#4a5568] font-bold">{(file.size / 1024).toFixed(1)} KB</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setFile(null)}
                    className="text-[10px] font-black uppercase tracking-widest text-[#4a5568] hover:text-white transition-colors"
                  >
                    Remove
                  </button>
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={!file || isUploading}
              className="w-full h-12 bg-[#CCFF00] text-[#020617] rounded-xl font-black uppercase tracking-widest hover:bg-[#abd600] disabled:opacity-30 disabled:cursor-not-allowed transition-all active:scale-[0.98] flex items-center justify-center gap-2"
            >
              Start Import
            </button>
          </form>
        )}

        {isUploading && (
          <div className="py-8 space-y-6">
            <div className="flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative w-16 h-16">
                <Loader2 className="w-16 h-16 text-[#CCFF00] animate-spin opacity-20" />
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-xs font-black text-[#CCFF00]">{Math.round(progress)}%</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-sm font-black text-white uppercase tracking-widest">{phaseMessage}</p>
                <p className="text-[10px] text-[#4a5568] font-bold uppercase tracking-tight">This may take a few minutes for large files</p>
              </div>
            </div>

            <div className="space-y-2">
              <div className="h-2 w-full bg-[#0c1324] border border-[#334155] rounded-full overflow-hidden">
                <div
                  className="h-full bg-[#CCFF00] transition-all duration-500 ease-out"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-[#4a5568]">
                <span>Status: Processing</span>
                <span>{file?.name}</span>
              </div>
            </div>
          </div>
        )}

        {result && (
          <div className={`p-4 rounded-xl border ${result.success ? 'bg-[#CCFF00]/5 border-[#CCFF00]/20' : 'bg-red-500/5 border-red-500/20'}`}>
            <div className="flex gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-[#CCFF00] shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              )}
              <div className="space-y-1">
                <p className={`text-[11px] font-black uppercase tracking-widest ${result.success ? 'text-[#CCFF00]' : 'text-red-400'}`}>
                  {result.success ? `Successfully imported ${result.count} workouts!` : 'Import failed'}
                </p>
                {result.error && <p className="text-[10px] text-[#4a5568] font-body">{result.error}</p>}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-[10px] font-black uppercase text-[#4a5568] tracking-widest">Some workouts could not be imported:</p>
                    <ul className="text-[10px] text-[#4a5568] list-disc list-inside max-h-32 overflow-y-auto font-body">
                      {result.errors.map((err, i) => (
                        <li key={i}>{err}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
            {result.success && (
              <button
                onClick={() => router.push('/dashboard')}
                className="mt-4 w-full h-10 glass-panel border border-[#334155] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#CCFF00]/30 transition-all"
              >
                Go to Dashboard
              </button>
            )}
            {!result.success && (
              <button
                onClick={() => setResult(null)}
                className="mt-4 w-full h-10 glass-panel border border-[#334155] text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-[#CCFF00]/30 transition-all"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>

      <div className="glass-panel border border-[#334155] rounded-xl p-6">
        <h3 className="text-[10px] font-black uppercase tracking-[0.15em] text-[#adb4ce] mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-[#4a5568]" />
          How to get your Hevy CSV
        </h3>
        <ol className="text-[11px] text-[#4a5568] space-y-2 list-decimal list-inside font-body">
          <li>Open the Hevy app on your phone</li>
          <li>Go to your <span className="text-white">Profile</span> tab</li>
          <li>Tap the <span className="text-white">Settings</span> icon (top right)</li>
          <li>Scroll down to <span className="text-white">Export & Import Data</span></li>
          <li>Select <span className="text-white">Export Workouts (CSV)</span></li>
          <li>Send the file to your computer and upload it here</li>
        </ol>
      </div>
    </div>
  )
}
