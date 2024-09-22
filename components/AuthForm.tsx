"use client"

import { useState, useEffect } from 'react'
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Icons } from "./ui/icons"
import pb, { registerUser } from '../utils/pocketbase'
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AuthFormProps {
  onAuth: (email: string, password: string, username: string | undefined, isLogin: boolean) => Promise<void>
  onGoogleAuth: () => Promise<void>
  onSetUsername: (username: string) => Promise<void>
  onDeleteAccount: () => Promise<void>
  error: string | null
  user: any | null
}

export default function AuthForm({ onAuth, onGoogleAuth, onSetUsername, onDeleteAccount, error: propError, user }: AuthFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [isLogin, setIsLogin] = useState(true)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(propError)

  useEffect(() => {
    setError(propError)
  }, [propError])

  useEffect(() => {
    if (user && user.provider === 'google' && !user.username) {
      setStep(3) // Set username for Google Auth users
    }
  }, [user])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)

    try {
      if (isLogin) {
        await onAuth(email, password, undefined, true)
      } else {
        await registerUser(email, password, username)
        setStep(2) // Move to verification step
      }
    } catch (error) {
      console.error(error)
      setError((error as Error).message || "An error occurred during authentication")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSetUsername(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    try {
      await onSetUsername(username)
      setStep(1) // Return to main view
    } catch (error) {
      console.error(error)
      setError((error as Error).message || "An error occurred while setting the username")
    } finally {
      setIsLoading(false)
    }
  }

  function renderForm() {
    switch (step) {
      case 1:
        return (
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="username">Username</Label>
                <Input
                  id="username"
                  type="text"
                  placeholder="johndoe"
                  value={username}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                  required
                  aria-required="true"
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="john@example.com"
                value={email}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEmail(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPassword(e.target.value)}
                required
                aria-required="true"
                minLength={8}
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>{isLogin ? 'Signing in...' : 'Creating account...'}</span>
                </>
              ) : (
                <span>{isLogin ? 'Sign in' : 'Create account'}</span>
              )}
            </Button>
          </form>
        )
      case 2:
        return (
          <div className="text-center space-y-4">
            <p>We've sent a verification email to <strong>{email}</strong>.</p>
            <p>Please check your inbox and click on the verification link to complete your registration.</p>
            <p>Once verified, you'll be automatically logged in.</p>
          </div>
        )
      case 3:
        return (
          <form onSubmit={handleSetUsername} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                placeholder="johndoe"
                value={username}
                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setUsername(e.target.value)}
                required
                aria-required="true"
              />
            </div>
            <Button className="w-full" type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Icons.spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                  <span>Setting username...</span>
                </>
              ) : (
                <span>Set username</span>
              )}
            </Button>
          </form>
        )
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isLogin ? 'Sign in' : (step === 1 ? 'Create account' : (step === 2 ? 'Verify your email' : 'Set username'))}
          </CardTitle>
          <CardDescription className="text-center">
            {isLogin ? 'Enter your credentials to access your account' : (step === 1 ? 'Fill in your details to get started' : (step === 2 ? 'Check your email for a verification link' : 'Choose a username for your account'))}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
          {renderForm()}
        </CardContent>
        <CardFooter className="flex flex-col space-y-4">
          {step === 1 && (
            <>
              <Button variant="outline" className="w-full" onClick={onGoogleAuth} disabled={isLoading}>
                <Icons.google className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Sign in with Google</span>
              </Button>
              <Button variant="link" className="w-full" onClick={() => setIsLogin(!isLogin)} disabled={isLoading}>
                <span>{isLogin ? "Don't have an account? Sign up" : "Already have an account? Sign in"}</span>
              </Button>
              {user && (
                <Button variant="destructive" className="w-full" onClick={onDeleteAccount} disabled={isLoading}>
                  Delete Account
                </Button>
              )}
            </>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}