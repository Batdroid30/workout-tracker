'use client'

import { useState, useRef } from 'react'
import { Profile } from '@/types/database'
import { Camera, LogOut, Save, User, Upload } from 'lucide-react'
import Link from 'next/link'
import { updateProfileAction, uploadAvatarAction, logoutAction } from './actions'
import { Button } from '@/components/ui/Button'
import { useDialog } from '@/providers/DialogProvider'

interface ProfileFormProps {
  profile: Profile | null
  userEmail: string
}

export function ProfileForm({ profile, userEmail }: ProfileFormProps) {
  const [firstName, setFirstName] = useState(profile?.first_name || '')
  const [lastName, setLastName] = useState(profile?.last_name || '')
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatar_url || '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const dialog = useDialog()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSaving(true)
    const formData = new FormData()
    formData.append('firstName', firstName)
    formData.append('lastName', lastName)

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
      } catch (error: any) {
        dialog.alert({ title: 'Error', description: error.message || 'Upload failed' })
      } finally {
        setIsUploading(false)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <div className="space-y-6">
      {/* Avatar Section */}
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

      {/* Form */}
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

        <Button
          type="submit"
          disabled={isSaving}
          className="w-full h-12"
        >
          {isSaving ? 'Saving...' : (
            <div className="flex items-center gap-2">
              <Save className="w-4 h-4" /> Save Changes
            </div>
          )}
        </Button>

        {/* Actions */}
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
            <Upload className="w-4 h-4 text-[#CCFF00]" /> Import logs (Hevy CSV)
          </Link>

          <button
            type="button"
            onClick={() => logoutAction()}
            className="w-full h-11 flex items-center justify-center gap-2 bg-red-500/5 border border-red-500/20 hover:bg-red-500/10 rounded-xl text-xs font-black text-red-500/70 hover:text-red-400 uppercase tracking-widest transition-colors"
          >
            <LogOut className="w-4 h-4" /> Log Out
          </button>
        </div>
      </form>
    </div>
  )
}
