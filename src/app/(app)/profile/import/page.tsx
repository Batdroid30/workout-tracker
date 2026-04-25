'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { importHevyCSVAction } from './actions'
import { Upload, FileText, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react'

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [result, setResult] = useState<{ success: boolean; count?: number; error?: string; errors?: string[] } | null>(null)
  const router = useRouter()

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
        <h1 className="text-3xl font-bold tracking-tight">Import Data</h1>
        <p className="text-zinc-400">
          Upload your workout data from other apps. Currently supporting Hevy CSV exports.
        </p>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-6 space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-4">
            <label 
              htmlFor="csv-upload"
              className="flex flex-col items-center justify-center w-full h-48 border-2 border-dashed border-zinc-800 rounded-lg cursor-pointer hover:bg-zinc-800/50 transition-colors"
            >
              <div className="flex flex-col items-center justify-center pt-5 pb-6">
                <Upload className="w-10 h-10 mb-3 text-zinc-500" />
                <p className="mb-2 text-sm text-zinc-400">
                  <span className="font-semibold">Click to upload</span> or drag and drop
                </p>
                <p className="text-xs text-zinc-500">Hevy CSV export file</p>
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
              <div className="flex items-center gap-3 p-3 bg-zinc-800/50 rounded-lg">
                <FileText className="w-5 h-5 text-teal-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{file.name}</p>
                  <p className="text-xs text-zinc-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <button 
                  type="button"
                  onClick={() => setFile(null)}
                  className="text-xs text-zinc-500 hover:text-white"
                >
                  Remove
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={!file || isUploading}
            className="w-full h-12 bg-teal-600 text-white rounded-lg font-semibold hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
          >
            {isUploading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Importing...
              </>
            ) : (
              'Start Import'
            )}
          </button>
        </form>

        {result && (
          <div className={`p-4 rounded-lg border ${result.success ? 'bg-teal-500/10 border-teal-500/20' : 'bg-red-500/10 border-red-500/20'}`}>
            <div className="flex gap-3">
              {result.success ? (
                <CheckCircle2 className="w-5 h-5 text-teal-500 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0" />
              )}
              <div className="space-y-1">
                <p className={`text-sm font-medium ${result.success ? 'text-teal-400' : 'text-red-400'}`}>
                  {result.success ? `Successfully imported ${result.count} workouts!` : 'Import failed'}
                </p>
                {result.error && <p className="text-xs text-zinc-400">{result.error}</p>}
                {result.errors && result.errors.length > 0 && (
                  <div className="mt-2 space-y-1">
                    <p className="text-xs font-semibold text-zinc-400">Some workouts could not be imported:</p>
                    <ul className="text-[10px] text-zinc-500 list-disc list-inside max-h-32 overflow-y-auto">
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
                className="mt-4 w-full h-10 bg-zinc-800 text-white rounded-lg text-sm font-medium hover:bg-zinc-700 transition-colors"
              >
                Go to Dashboard
              </button>
            )}
          </div>
        )}
      </div>

      <div className="bg-zinc-900/50 border border-zinc-800 rounded-xl p-6">
        <h3 className="text-sm font-semibold mb-4 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-zinc-500" />
          How to get your Hevy CSV
        </h3>
        <ol className="text-sm text-zinc-400 space-y-2 list-decimal list-inside">
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
