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
  { value: 'strength', label: 'Strength',      description: 'Lift heavier',  emoji: '🏋️' },
  { value: 'muscle',   label: 'Build Muscle',  description: 'Get bigger',    emoji: '💪' },
  { value: 'both',     label: 'Both',          description: 'Mix of both',   emoji: '⚡' },
]

const PHASE_OPTIONS: TileOption<TrainingPhase>[] = [
  { value: 'bulking',     label: 'Bulking',     description: 'Building size',  emoji: '📈' },
  { value: 'cutting',     label: 'Cutting',     description: 'Leaning down',   emoji: '🔥' },
  { value: 'maingaining', label: 'Maingaining', description: 'Slow & steady',  emoji: '⚖️' },
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
      <p className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.15em]">{label}</p>
      <div className={cn('grid gap-2', options.length === 2 ? 'grid-cols-2' : 'grid-cols-3')}>
        {options.map(opt => (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'flex flex-col items-center gap-1 p-3 rounded-xl border transition-all text-center disabled:opacity-50',
              selected === opt.value
                ? 'border-[#CCFF00]/60 bg-[#CCFF00]/10'
                : 'border-[#334155] bg-[#0c1324] hover:border-[#334155]/80 active:scale-95',
            )}
          >
            <span className="text-lg">{opt.emoji}</span>
            <span className={cn(
              'text-[10px] font-black uppercase tracking-tight leading-tight',
              selected === opt.value ? 'text-[#CCFF00]' : 'text-[#adb4ce]',
            )}>
              {opt.label}
            </span>
            <span className="text-[9px] text-[#4a5568] font-body leading-tight">{opt.description}</span>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  // Personal info state
  const [firstName,   setFirstName]   = useState(profile?.first_name  || '')
  const [lastName,    setLastName]    = useState(profile?.last_name   || '')
  const [avatarUrl,   setAvatarUrl]   = useState(profile?.avatar_url  || '')
  const [isSaving,    setIsSaving]    = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [isRefreshing,setIsRefreshing]= useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialog = useDialog()

  // Training profile state — initialised from DB, optimistically updated on tile tap
  const [trainingGoal,    setTrainingGoal]    = useState<TrainingGoal    | null>(profile?.training_goal    ?? null)
  const [trainingPhase,   setTrainingPhase]   = useState<TrainingPhase   | null>(profile?.training_phase   ?? null)
  const [trainingStyle,   setTrainingStyle]   = useState<TrainingStyle   | null>(profile?.training_style   ?? null)
  const [experienceLevel, setExperienceLevel] = useState<ExperienceLevel | null>(profile?.experience_level ?? null)
  const [savingField,     setSavingField]     = useState<string | null>(null)
  const [lastSavedField,  setLastSavedField]  = useState<string | null>(null)

  // ── Personal info handlers ──────────────────────────────────────────────────

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

  // ── Training profile handler ────────────────────────────────────────────────

  async function handleTrainingUpdate(
    field: string,
    value: string,
    setter: (v: any) => void,
  ) {
    setter(value)                      // optimistic — update UI immediately
    setSavingField(field)
    await updateTrainingProfileAction({ [field]: value } as Parameters<typeof updateTrainingProfileAction>[0])
    setSavingField(null)
    // Brief "saved" tick — clears after 1.5s
    setLastSavedField(field)
    setTimeout(() => setLastSavedField(f => f === field ? null : f), 1500)
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-6">

      {/* Avatar */}
      <div className="glass-panel border border-[#334155] rounded-xl p-5 flex flex-col items-center">
        <div className="relative mb-4">
          <div className="w-24 h-24 rounded-xl overflow-hidden border-2 border-[#CCFF00]/30 bg-[#0c1324] flex items-center justify-center relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-[#334155]" />
            )}
            {isUploading && (
              <div className="absolute inset-0 bg-[#070d1f]/70 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute -bottom-1 -right-1 bg-[#CCFF00] p-1.5 rounded-lg shadow-lg hover:bg-[#abd600] active:scale-95 transition-all"
          >
            <Camera className="w-3.5 h-3.5 text-[#020617]" />
          </button>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <p className="text-[11px] text-[#4a5568] font-body tracking-wide">{userEmail}</p>
      </div>

      {/* Personal Info */}
      <form onSubmit={handleSave} className="space-y-5">
        <div className="glass-panel border border-[#334155] rounded-xl p-4 space-y-4">
          <h3 className="text-[10px] font-black text-[#adb4ce] uppercase tracking-[0.15em]">Personal Info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-[#4a5568] uppercase tracking-[0.15em]">First Name</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
                className="w-full bg-[#070d1f] border border-[#334155] rounded-xl px-3 py-2.5 text-sm text-white font-body focus:outline-none focus:border-[#CCFF00]/50 transition-colors"
              />
            </div>
            <div className="space-y-1.5">
              <label className="block text-[10px] font-black text-[#4a5568] uppercase tracking-[0.15em]">Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
                className="w-full bg-[#070d1f] border border-[#334155] rounded-xl px-3 py-2.5 text-sm text-white font-body focus:outline-none focus:border-[#CCFF00]/50 transition-colors"
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

      {/* Training Profile */}
      <div className="glass-panel border border-[#334155] rounded-xl p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-[10px] font-black text-[#adb4ce] uppercase tracking-[0.15em]">Training Profile</h3>
          {lastSavedField && (
            <span className="flex items-center gap-1 text-[9px] font-black text-[#CCFF00] uppercase tracking-widest">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {savingField && !lastSavedField && (
            <div className="w-3 h-3 border border-[#CCFF00] border-t-transparent rounded-full animate-spin" />
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

        <p className="text-[10px] text-[#4a5568] font-body leading-relaxed">
          These settings personalise your rep targets, weekly volume goals, and recovery suggestions. You can update them any time.
        </p>
      </div>

      {/* Account Actions */}
      <div className="space-y-2 pt-2 border-t border-[#1e293b]">
        <p className="text-[10px] font-black text-[#4a5568] uppercase tracking-[0.15em] mb-3">Account</p>

        <button
          type="button"
          onClick={() => { window.location.href = '/api/export' }}
          className="w-full h-11 flex items-center justify-center gap-2 glass-panel border border-[#334155] hover:border-[#CCFF00]/20 rounded-xl text-xs font-black text-[#adb4ce] hover:text-white uppercase tracking-widest transition-colors"
        >
          Export Workout Data (CSV)
        </button>

        <Link
          href="/profile/import"
          className="w-full h-11 flex items-center justify-center gap-2 glass-panel border border-[#334155] hover:border-[#CCFF00]/20 rounded-xl text-xs font-black text-[#adb4ce] hover:text-white uppercase tracking-widest transition-colors"
        >
          <Upload className="w-4 h-4 text-[#CCFF00]" /> Import logs (CSV)
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
          className="w-full h-11 flex items-center justify-center gap-2 glass-panel border border-[#334155] hover:border-[#CCFF00]/20 rounded-xl text-xs font-black text-[#adb4ce] hover:text-white uppercase tracking-widest transition-colors disabled:opacity-40"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>

        <button
          type="button"
          onClick={() => logoutAction()}
          className="w-full h-11 flex items-center justify-center gap-2 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 rounded-xl text-xs font-black text-red-500/70 hover:text-red-400 uppercase tracking-widest transition-colors"
        >
          <LogOut className="w-4 h-4" /> Log Out
        </button>
      </div>

    </div>
  )
}
