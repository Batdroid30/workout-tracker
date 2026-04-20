import { auth } from '@/lib/auth'
import { getProfile } from '@/lib/data/profile'
import { redirect } from 'next/navigation'
import { ProfileForm } from './ProfileForm'

export default async function ProfilePage() {
  const session = await auth()
  
  if (!session?.user?.id) {
    redirect('/login')
  }

  const profile = await getProfile(session.user.id)

  return (
    <div className="min-h-screen bg-black text-white p-4 pb-24">
      {/* Header */}
      <div className="pt-8 mb-12">
        <h1 className="text-4xl font-bold font-sans">Profile</h1>
        <p className="text-zinc-500 font-mono text-sm tracking-widest uppercase mt-1">Manage your account</p>
      </div>

      <div className="max-w-md mx-auto">
        <ProfileForm 
          profile={profile} 
          userEmail={session.user.email || ''} 
        />
      </div>
    </div>
  )
}
