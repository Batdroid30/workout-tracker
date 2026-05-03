'use client'

import { useState, useRef } from 'react'
import { cn } from '@/lib/utils'
import type { Profile, TrainingGoal, TrainingPhase, TrainingStyle, ExperienceLevel } from '@/types/database'
import { Camera, LogOut, RefreshCw, Save, User, Upload, Check } from 'lucide-react'
import Link from 'next/link'
import {
  updateProfileAction,
  uploadAvatarAction,
  logoutAction,
  refreshCacheAction,
  updateTrainingProfileAction,
} from './actions'
import { Button } from '@/components/ui/Button'
import { useDialog } from '@/providers/DialogProvider'

interface ProfileFormProps {
  profile: Profile | null
  userEmail: string
}

// ── Tile option shape ─────────────────────────────────────────────────────────

interface TileOption<T extends string> {
  value: T
  label: string
  description: string
  emoji: string
}

const GOAL_OPTIONS: TileOption<TrainingGoal>[] = [
  { value: 'strength', label: 'Strength',     description: 'Lift heavier', emoji: '🏋️' },
  { value: 'muscle',   label: 'Build Muscle', description: 'Get bigger',   emoji: '💪' },
  { value: 'both',     label: 'Both',         description: 'Mix of both',  emoji: '⚡' },
]

const PHASE_OPTIONS: TileOption<TrainingPhase>[] = [
  { value: 'bulking',     label: 'Bulking',     description: 'Building size', emoji: '📈' },
  { value: 'cutting',     label: 'Cutting',     description: 'Leaning down',  emoji: '🔥' },
  { value: 'maingaining', label: 'Maingaining', description: 'Slow & steady', emoji: '⚖️' },
]

const STYLE_OPTIONS: TileOption<TrainingStyle>[] = [
  { value: 'volume',    label: 'Volume',    description: 'More sets, moderate effort', emoji: '📊' },
  { value: 'intensity', label: 'Intensity', description: 'Fewer sets, push hard',      emoji: '🎯' },
]

const EXPERIENCE_OPTIONS: TileOption<ExperienceLevel>[] = [
  { value: 'beginner',     label: 'Beginner',     description: 'Under 1 year', emoji: '🌱' },
  { value: 'intermediate', label: 'Intermediate', description: '1–3 years',    emoji: '📈' },
  { value: 'advanced',     label: 'Advanced',     description: '3+ years',     emoji: '🏆' },
]

// ── Tile picker ───────────────────────────────────────────────────────────────

interface TileGroupProps<T extends string> {
  label: string
  options: TileOption<T>[]
  selected: T | null
  saving: boolean
  onSelect: (value: T) => void
}

function TileGroup<T extends string>({ label, options, selected, saving, onSelect }: TileGroupProps<T>) {
  return (
    <div className="space-y-2">
      <p className="t-label">{label}</p>
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => onSelect(opt.value)}
            className="flex flex-col items-center gap-1 p-3 rounded-[var(--radius-inner)] transition-all text-center disabled:opacity-50 active:scale-95"
            style={selected === opt.value
              ? { border: '1px solid var(--accent-line)', background: 'var(--accent-soft)' }
              : { border: '1px solid var(--glass-border)', background: 'rgba(255,255,255,0.03)' }
            }
          >
            <span className="text-lg">{opt.emoji}</span>
            <span
              className="text-[10px] font-semibold uppercase tracking-tight leading-tight"
              style={{ color: selected === opt.value ? 'var(--accent)' : 'var(--text-mid)' }}
            >
              {opt.label}
            </span>
            <span className="t-caption leading-tight">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [firstName,    setFirstName]    = useState(profile?.first_name  || '')
  const [lastName,     setLastName]     = useState(profile?.last_name   || '')
  const [avatarUrl,    setAvatarUrl]    = useState(profile?.avatar_url  || '')
  const [isSaving,     setIsSaving]     = useState(false)
  const [isUploading,  setIsUploading]  = useState(false)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialog = useDialog()

  const [trainingGoal,    setTrainingGoal]    = useState<TrainingGoal    | null>(profile?.training_goal    ?? null)
  const [trainingPhase,   setTrainingPhase]   = useState<TrainingPhase   | null>(profile?.training_phase   ?? null)
  const [trainingStyle,   setTrainingStyle]   = useState<TrainingStyle   | null>(profile?.training_style   ?? null)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(profile?.experience_level ?? null)
  const [savingField,     setSavingField]     = useState<string | null>(null)
  const [lastSavedField,  setLastSavedField]  = useState<string | null>(null)

  // ── Personal info handlers ────────────────────────────────────────────────

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData()
    formData.append('firstName', firstName)
    formData.append('lastName',  lastName)
    const result = await updateProfileAction(formData)
    if (result.success) {
      dialog.alert({ title: 'Success', description: 'Profile updated!' })
    } else {
      dialog.alert({ title: 'Error', description: result.error || 'Failed to update profile' })
    }
    setIsSaving(false)
  }

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    const reader = new FileReader()
    reader.onloadend = async () => {
      const base64Image = reader.result as string
      try {
        const result = await uploadAvatarAction(base64Image, file.name)
        if (result.success) {
          setAvatarUrl(result.url || '')
        } else {
          dialog.alert({ title: 'Error', description: result.error || 'Upload failed' })
        }
      } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Upload failed'
        dialog.alert({ title: 'Error', description: message })
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  // ── Training profile handler ──────────────────────────────────────────────

  async function handleTrainingUpdate(
    field: string,
    value: string,
    setter: (v: any) => void,
  ) {
    setter(value)
    setSavingField(field)
    await updateTrainingProfileAction({ [field]: value } as Parameters<typeof updateTrainingProfileAction>[0])
    setSavingField(null)
    setLastSavedField(field)
    setTimeout(() => setLastSavedField(f => f === field ? null : f), 1500)
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* ── Avatar ───────────────────────────────────────────────────── */}
      <div className="glass p-5 flex flex-col items-center">
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-[var(--radius-inner)] overflow-hidden flex items-center justify-center relative"
            style={{ background: 'var(--bg-2)', border: '2px solid var(--accent-line)' }}
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10" style={{ color: 'var(--text-faint)' }} />
            )}
            {isUploading && (
              <div
                className="absolute inset-0 flex items-center justify-center"
                style={{ background: 'rgba(6,7,13,0.70)' }}
              >
                <div
                  className="w-5 h-5 border-2 border-t-transparent rounded-full animate-spin"
                  style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
                />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 p-1.5 rounded-lg shadow-lg hover:opacity-90 active:scale-95 transition-all"
            style={{ background: 'var(--accent)' }}
          >
            <Camera className="w-3.5 h-3.5" style={{ color: 'var(--accent-on)' }} />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <p className="t-caption">{userEmail}</p>
      </div>

      {/* ── Personal Info ─────────────────────────────────────────────── */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="glass p-4 space-y-4">
          <h3 className="t-label">Personal Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="t-label block">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
                className="w-full rounded-[var(--radius-inner)] px-3 py-2.5 text-sm focus:outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-hi)',
                }}
              />
            </div>
            <div className="space-y-1.5">
              <label className="t-label block">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
                className="w-full rounded-[var(--radius-inner)] px-3 py-2.5 text-sm focus:outline-none transition-colors"
                style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid var(--glass-border)',
                  color: 'var(--text-hi)',
                }}
              />
            </div>
          </div>
        </div>
        <Button type="submit" disabled={isSaving} className="w-full h-12">
          {isSaving ? 'Saving...' : (
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </div>
          )}
        </Button>
      </form>

      {/* ── Training Profile ──────────────────────────────────────────── */}
      <div className="glass p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="t-label">Training Profile</h3>
          {lastSavedField && (
            <span
              className="flex items-center gap-1 text-[9px] font-medium uppercase tracking-widest"
              style={{ color: 'var(--accent)' }}
            >
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {savingField && !lastSavedField && (
            <div
              className="w-3 h-3 border border-t-transparent rounded-full animate-spin"
              style={{ borderColor: 'var(--accent)', borderTopColor: 'transparent' }}
            />
          )}
        </div>

        <TileGroup
          label="Goal"
          options={GOAL_OPTIONS}
          selected={trainingGoal}
          saving={savingField === 'training_goal'}
          onSelect={v => handleTrainingUpdate('training_goal', v, setTrainingGoal)}
        />

        <TileGroup
          label="Current Phase"
          options={PHASE_OPTIONS}
          selected={trainingPhase}
          saving={savingField === 'training_phase'}
          onSelect={v => handleTrainingUpdate('training_phase', v, setTrainingPhase)}
        />

        <TileGroup
          label="Training Style"
          options={STYLE_OPTIONS}
          selected={trainingStyle}
          saving={savingField === 'training_style'}
          onSelect={v => handleTrainingUpdate('training_style', v, setTrainingStyle)}
        />

        <TileGroup
          label="Experience"
          options={EXPERIENCE_OPTIONS}
          selected={experienceLevel}
          saving={savingField === 'experience_level'}
          onSelect={v => handleTrainingUpdate('experience_level', v, setExperienceLevel)}
        />

        <p className="t-caption leading-relaxed">
          These settings personalise your rep targets, weekly volume goals, and recovery suggestions.
          You can update them any time.
        </p>
      </div>

      {/* ── Account Actions ───────────────────────────────────────────── */}
      <div className="space-y-2 pt-2" style={{ borderTop: '1px solid var(--glass-border)' }}>
        <p className="t-label mb-3">Account</p>

        <button
          type="button"
          onClick={() => { window.location.href = '/api/export' }}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-widest transition-colors hover:opacity-90 active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-mid)',
          }}
        >
          Export Workout Data (CSV)
        </button>

        <Link
          href="/profile/import"
          className="w-full h-11 flex items-center justify-center gap-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-widest transition-colors hover:opacity-90 active:scale-95"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-mid)',
          }}
        >
          <Upload className="w-4 h-4" style={{ color: 'var(--accent)' }} /> Import logs (CSV)
        </Link>

        <button
          type="button"
          disabled={isRefreshing}
          onClick={async () => {
            setIsRefreshing(true)
            await refreshCacheAction()
            setIsRefreshing(false)
            window.location.reload()
          }}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-widest transition-colors hover:opacity-90 active:scale-95 disabled:opacity-40"
          style={{
            background: 'rgba(255,255,255,0.03)',
            border: '1px solid var(--glass-border)',
            color: 'var(--text-mid)',
          }}
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>

        <button
          type="button"
          onClick={() => logoutAction()}
          className="w-full h-11 flex items-center justify-center gap-2 rounded-[var(--radius-inner)] text-xs font-medium uppercase tracking-widest transition-colors hover:bg-red-500/10 active:scale-95"
          style={{ background: 'rgba(239,68,68,0.05)', border: '1px solid rgba(239,68,68,0.20)', color: 'rgba(239,68,68,0.70)' }}
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>

    </div>
  )
}
