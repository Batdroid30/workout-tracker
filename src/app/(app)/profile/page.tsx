import { redirect } from 'next/navigation'
import { profileRedirectTarget } from './redirect-target'

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>
}) {
  const { tab } = await searchParams
  redirect(profileRedirectTarget(tab))
}
