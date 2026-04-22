'use client'

import { useState, useRef } from 'react'
import { Profile } from '@/types/database'
import { Camera, LogOut, Save, User } from 'lucide-react'
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
    <div className="space-y-8">
      {/* Avatar Section */}
      <div className="flex flex-col items-center">
        <div className="relative group">
          <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-zinc-800 bg-zinc-900 flex items-center justify-center relative">
            {avatarUrl ? (
              <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
            ) : (
              <User className="w-16 h-16 text-zinc-700" />
            )}
            
            {isUploading && (
              <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                <div className="w-6 h-6 border-2 border-brand border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          
          <button 
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="absolute bottom-0 right-0 bg-brand p-2 rounded-full shadow-lg hover:bg-brand-hover active:scale-95 transition-all"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*"
            onChange={handleFileChange}
          />
        </div>
        <p className="mt-4 text-zinc-500 font-mono text-xs uppercase tracking-widest">{userEmail}</p>
      </div>

      {/* Form */}
      <form onSubmit={handleSave} className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">First Name</label>
            <input 
              type="text"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              placeholder="First Name"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors font-sans"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-bold text-zinc-500 uppercase tracking-widest ml-1">Last Name</label>
            <input 
              type="text"
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
              placeholder="Last Name"
              className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-brand transition-colors font-sans"
            />
          </div>
        </div>

        <Button 
          type="submit" 
          disabled={isSaving}
          className="w-full h-14 text-lg font-bold"
        >
          {isSaving ? 'Saving...' : (
            <div className="flex items-center gap-2">
              <Save className="w-5 h-5" /> Save Changes
            </div>
          )}
        </Button>
        {/* Actions */}
        <div className="space-y-3 pt-6 border-t border-zinc-800">
          <Button 
            type="button" 
            variant="secondary"
            className="w-full h-12 bg-zinc-900 border border-zinc-800 text-white hover:bg-zinc-800"
            onClick={() => {
              window.location.href = '/api/export'
            }}
          >
            Export Workout Data (CSV)
          </Button>

          <Button 
            type="button" 
            variant="secondary" 
            onClick={() => logoutAction()}
            className="w-full h-12 bg-red-500/10 text-red-500 hover:bg-red-500/20 border-none"
          >
            <LogOut className="w-5 h-5 mr-2" /> Log Out
          </Button>
        </div>
      </form>
    </div>
  )
}
