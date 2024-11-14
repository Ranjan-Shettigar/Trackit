import { redirect } from 'next/navigation'
import pb from '@/utils/pocketbase'

export default async function Home() {
  const isAuthenticated = pb.authStore.isValid

  if (!isAuthenticated) {
    redirect('/land')
  } else {
    redirect('/dashboard')
  }

  // This part will never be reached due to the redirects above,
  // but we need to return something to satisfy TypeScript
  return null
}