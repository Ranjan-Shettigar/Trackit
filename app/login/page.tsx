'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import pb, { registerUser } from '@/utils/pocketbase';

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    const checkAuthStatus = async () => {
      if (pb.authStore.isValid) {
        router.push('/dashboard');
      } else {
        setIsLoading(false);
      }
    };

    checkAuthStatus();
  }, [router]);

  const handleAuth = async (email: string, password: string, username: string | undefined, isLogin: boolean) => {
    try {
      if (isLogin) {
        await pb.collection('users').authWithPassword(email, password);
        router.push('/dashboard');
      } else {
        if (username) {
          await registerUser(email, password, username);
          router.push('/dashboard');
        } else {
          throw new Error('Username is required for registration');
        }
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError((error as Error).message || 'An error occurred during authentication');
    }
  };

  const handleGoogleAuth = async () => {
    try {
      await pb.collection('users').authWithOAuth2({ provider: 'google' });
      router.push('/dashboard');
    } catch (error) {
      console.error('Google auth error:', error);
      setError((error as Error).message || 'An error occurred during Google authentication');
    }
  };

  if (isLoading) {
    return <div>Loading...</div>; // You can replace this with a proper loading component
  }

  return (
    <AuthForm
      onAuth={handleAuth}
      onGoogleAuth={handleGoogleAuth}
      error={error}
    />
  );
}