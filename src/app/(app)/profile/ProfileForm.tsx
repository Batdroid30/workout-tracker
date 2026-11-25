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
import { Button, Input, ToggleChip, getButtonClassName } from '@/components/ui'
import { useDialog } from '@/providers/DialogProvider'
import { resizeImageToDataUrl } from '@/lib/image/resize-image'

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
  { value: 'muscle',   label: 'Build muscle', description: 'Get bigger',   emoji: '💪' },
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
        {options.map(opt => {
          const isSelected = selected === opt.value
          return (
          <button
            key={opt.value}
            type="button"
            disabled={saving}
            onClick={() => onSelect(opt.value)}
            className={cn(
              'flex min-w-0 flex-col items-center gap-1 p-3 rounded-control transition-all text-center disabled:opacity-50 active:scale-95',
              isSelected ? 'bg-primary text-bg border border-primary' : 'bg-surface-raised border border-border',
            )}
          >
            <span className="text-lg">{opt.emoji}</span>
            <span className={cn('text-xs font-semibold leading-tight', isSelected ? 'text-bg' : 'text-primary')}>
              {opt.label}
            </span>
            <span className={cn('t-caption leading-tight', isSelected && 'text-bg/70')}>{opt.description}</span>
          </button>
          )
        })}
      </div>
    </div>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [firstName,    setFirstName]    = useState(profile?.first_name  || '')
  const [lastName,     setLastName]     = useState(profile?.last_name   || '')
  const [avatarUrl,    setAvatarUrl]    = useState(profile?.avatar_url  || '')
  const [heightCm,     setHeightCm]     = useState(profile?.height_cm ? String(profile.height_cm) : '')
  const [ageYears,     setAgeYears]     = useState(profile?.age_years   ? String(profile.age_years)  : '')
  const [sex,          setSex]          = useState<'male' | 'female' | null>(profile?.sex ?? null)
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
    if (heightCm) formData.append('heightCm', heightCm)
    if (ageYears)  formData.append('ageYears',  ageYears)
    if (sex)       formData.append('sex',       sex)
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
    try {
      const base64Image = await resizeImageToDataUrl(file)
      const jpegName    = `${file.name.replace(/\.[^.]*$/, '') || 'avatar'}.jpg`
      const result      = await uploadAvatarAction(base64Image, jpegName)
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
      <div className="card p-5 flex flex-col items-center">
        <div className="relative mb-4">
          <div
            className="w-24 h-24 rounded-card overflow-hidden flex items-center justify-center relative bg-surface-raised border-2 border-border-strong"
          >
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-10 h-10 text-tertiary" />
            )}
            {isUploading && (
              <div className="absolute inset-0 flex items-center justify-center bg-bg/70">
                <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            aria-label="Change avatar"
            className="focus-ring absolute -bottom-3 -right-3 flex size-11 items-center justify-center before:absolute before:size-7 before:rounded-pill before:bg-primary [&>svg]:relative [&>svg]:text-bg hover:opacity-90 active:scale-95 transition-all"
          >
            <Camera className="w-3.5 h-3.5" />
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
        <div className="card p-4 space-y-4">
          <h3 className="t-label">Personal info</h3>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="t-label block">First name</label>
              <Input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="First"
              />
            </div>
            <div className="space-y-1.5">
              <label className="t-label block">Last name</label>
              <Input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Last"
              />
            </div>
          </div>

          {/* Body stats — used for TDEE / nutrition coaching */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="t-label block">Height (cm)</label>
              <Input
                type="number"
                inputMode="numeric"
                value={heightCm}
                onChange={e => setHeightCm(e.target.value)}
                placeholder="e.g. 178"
                min={100}
                max={250}
              />
            </div>
            <div className="space-y-1.5">
              <label className="t-label block">Age</label>
              <Input
                type="number"
                inputMode="numeric"
                value={ageYears}
                onChange={e => setAgeYears(e.target.value)}
                placeholder="e.g. 28"
                min={13}
                max={100}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="t-label block">Sex</label>
            <div className="grid grid-cols-2 gap-2">
              {(['male', 'female'] as const).map(s => (
                <ToggleChip key={s} size="sm" selected={sex === s} onClick={() => setSex(s)}>
                  {s === 'male' ? 'Male' : 'Female'}
                </ToggleChip>
              ))}
            </div>
          </div>
        </div>
        <Button type="submit" loading={isSaving} leadingIcon={<Save className="w-4 h-4" />}>
          {isSaving ? 'Saving...' : 'Save changes'}
        </Button>
      </form>

      {/* ── Training Profile ──────────────────────────────────────────── */}
      <div className="card p-4 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="t-label">Training profile</h3>
          {lastSavedField && (
            <span className="flex items-center gap-1 text-xs font-medium text-positive">
              <Check className="w-3 h-3" /> Saved
            </span>
          )}
          {savingField && !lastSavedField && (
            <div className="w-3 h-3 border border-primary border-t-transparent rounded-full animate-spin" />
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
          label="Current phase"
          options={PHASE_OPTIONS}
          selected={trainingPhase}
          saving={savingField === 'training_phase'}
          onSelect={v => handleTrainingUpdate('training_phase', v, setTrainingPhase)}
        />

        <TileGroup
          label="Training style"
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
      <div className="space-y-2 pt-2 border-t border-border">
        <p className="t-label mb-3">Account</p>

        <Button
          type="button"
          variant="secondary"
          onClick={() => { window.location.href = '/api/export' }}
        >
          Export workout data (CSV)
        </Button>

        <Link
          href="/account/import"
          className={getButtonClassName({ variant: 'secondary' })}
        >
          <Upload className="w-4 h-4 text-secondary" /> Import logs (CSV)
        </Link>

        <Button
          type="button"
          variant="secondary"
          disabled={isRefreshing}
          onClick={async () => {
            setIsRefreshing(true)
            await refreshCacheAction()
            setIsRefreshing(false)
            window.location.reload()
          }}
          leadingIcon={<RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />}
        >
          {isRefreshing ? 'Refreshing...' : 'Refresh data'}
        </Button>

        <Button
          type="button"
          variant="destructive"
          onClick={() => logoutAction()}
          leadingIcon={<LogOut className="w-4 h-4" />}
        >
          Log out
        </Button>
      </div>

    </div>
  )
}
