'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import AuthForm from '@/components/AuthForm'
import pb, { registerUser } from '@/utils/pocketbase'

export default function Login() {
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<any | null>(null)
  const router = useRouter()

  useEffect(() => {
    setUser(pb.authStore.model)
  }, [])

  const handleAuth = async (email: string, password: string, username: string | undefined, isLogin: boolean) => {
    try {
      if (isLogin) {
        await pb.collection('users').authWithPassword(email, password)
      } else {
        if (username) {
          await registerUser(email, password, username)
        } else {
          throw new Error('Username is required for registration')
        }
      }
      router.push('/dashboard')
    } catch (error) {
      console.error('Auth error:', error)
      setError((error as Error).message || 'An error occurred during authentication')
    }
  }

  const handleGoogleAuth = async () => {
    try {
      await pb.collection('users').authWithOAuth2({ provider: 'google' })
      router.push('/dashboard')
    } catch (error) {
      console.error('Google auth error:', error)
      setError((error as Error).message || 'An error occurred during Google authentication')
    }
  }

  const handleSetUsername = async (username: string) => {
    try {
      if (pb.authStore.model) {
        await pb.collection('users').update(pb.authStore.model.id, { username })
        setUser({ ...pb.authStore.model, username })
      } else {
        throw new Error('User is not authenticated')
      }
    } catch (error) {
      console.error('Set username error:', error)
      setError((error as Error).message || 'An error occurred while setting the username')
    }
  }

  const handleDeleteAccount = async () => {
    if (window.confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      try {
        if (pb.authStore.model) {
          await pb.collection('users').delete(pb.authStore.model.id)
          pb.authStore.clear()
          router.push('/login')
        } else {
          throw new Error('User is not authenticated')
        }
      } catch (error) {
        console.error('Delete account error:', error)
        setError((error as Error).message || 'An error occurred while deleting the account')
      }
    }
  }

  return (
    <AuthForm
      onAuth={handleAuth}
      onGoogleAuth={handleGoogleAuth}
      onSetUsername={handleSetUsername}
      onDeleteAccount={handleDeleteAccount}
      error={error}
      user={user}
    />
  )
}