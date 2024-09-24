'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import AuthForm from '@/components/AuthForm';
import pb, { registerUser, sendPasswordResetEmail } from '@/utils/pocketbase';

interface User {
  id: string;
  email: string;
  username?: string;
  provider: string;
  // Add any other specific fields you expect from the user model
}

export default function Login() {
  const [error, setError] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const router = useRouter();

  useEffect(() => {
    const currentUser = pb.authStore.model as User | null;
    setUser(
      currentUser
        ? {
            ...currentUser,
            provider: currentUser.provider || 'email', // Assuming 'email' as default provider
          }
        : null
    );

    // Redirect to dashboard if user is already logged in
    if (currentUser) {
      router.push('/dashboard');
    }
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

  const handleForgotPassword = async (email: string) => {
    try {
      await sendPasswordResetEmail(email);
      setError('Password reset email sent. Please check your inbox.');
    } catch (error) {
      console.error('Forgot password error:', error);
      setError((error as Error).message || 'An error occurred while resetting the password');
    }
  };

  return (
    <AuthForm
      onAuth={handleAuth}
      onGoogleAuth={handleGoogleAuth}
      onForgotPassword={handleForgotPassword} // Passing the forgot password handler
      error={error}
      user={user}
    />
  );
}
