'use server'

import { auth, signOut } from '@/lib/auth'
import { updateProfile as updateProfileData } from '@/lib/data/profile'
import { revalidatePath } from 'next/cache'
import { getSupabaseServer } from '@/lib/supabase/server'

export async function updateProfileAction(formData: FormData) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  
  try {
    await updateProfileData(session.user.id, {
      first_name: firstName,
      last_name: lastName,
    })
    revalidatePath('/profile')
    revalidatePath('/dashboard')
    return { success: true }
  } catch (error: any) {
    console.error('Error updating profile:', error)
    return { success: false, error: error.message }
  }
}

export async function uploadAvatarAction(base64Image: string, fileName: string) {
  const session = await auth()
  if (!session?.user?.id) throw new Error('Not authenticated')

  const supabase = await getSupabaseServer()
  
  // Convert base64 to buffer
  const buffer = Buffer.from(base64Image.split(',')[1], 'base64')
  
  const path = `${session.user.id}/${Date.now()}-${fileName}`
  
  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .upload(path, buffer, {
        contentType: 'image/png',
        upsert: true
      })

    if (error) {
      if (error.message.includes('Bucket not found')) {
        throw new Error('Storage bucket "avatars" not found. Please create it in your Supabase dashboard.')
      }
      throw error
    }

    const { data: { publicUrl } } = supabase.storage
      .from('avatars')
      .getPublicUrl(path)

    await updateProfileData(session.user.id, {
      avatar_url: publicUrl
    })

    revalidatePath('/profile')
    revalidatePath('/dashboard')
    
    return { success: true, url: publicUrl }
  } catch (error: any) {
    console.error('Upload error:', error)
    return { success: false, error: error.message }
  }
}

export async function logoutAction() {
  await signOut({ redirectTo: '/login' })
}
