"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Icons } from "./ui/icons"
import { registerUser} from "../utils/pocketbase"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

// interface User {
//   provider: string
//   username?: string
// }

interface AuthFormProps {
  onAuth: (email: string, password: string, username: string | undefined, isLogin: boolean) => Promise<void>;
  onGoogleAuth: () => Promise<void>;
  onForgotPassword: (email: string) => Promise<void>;
  error: string | null;
  // user: User | null;
}

export default function AuthForm({ onAuth, onGoogleAuth, onForgotPassword, error: propError }: AuthFormProps) {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [username, setUsername] = useState("")
  const [isLogin, setIsLogin] = useState(true)
  const [isForgotPassword, setIsForgotPassword] = useState(false)
  const [step, setStep] = useState(1)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(propError)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const router = useRouter()

  useEffect(() => {
    setError(propError)
  }, [propError])

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    try {
      if (isLogin) {
        await onAuth(email, password, undefined, true)
      } else {
        await registerUser(email, password, username)
        setStep(2)
        setSuccessMessage(`Weve sent a verification email to ${email}. Please check your inbox.`)
        setTimeout(() => {
          router.push("/login")
        }, 3000)
      }
    } catch (error) {
      console.error(error)
      setError((error as Error).message || "An error occurred during authentication")
    } finally {
      setIsLoading(false)
    }
  }

  async function handleForgotPasswordSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsLoading(true)
    setError(null)
    setSuccessMessage(null)

    if (!email) {
      setError("Please enter your email address.")
      setIsLoading(false)
      return
    }

    try {
      await onForgotPassword(email)
      setSuccessMessage("Password reset email sent. Please check your inbox.")
      setTimeout(() => {
        router.push("/login")
      }, 3000)
    } catch (error) {
      console.error(error)
      setError((error as Error).message || "Failed to send password reset email.")
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4 py-12 sm:px-6 lg:px-8">

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            {isForgotPassword ? "Reset Password" : isLogin ? "Sign in" : step === 1 ? "Create account" : "Verify your email"}
          </CardTitle>
          <CardDescription className="text-center">
            {isForgotPassword
              ? "Enter your email to reset your password"
              : isLogin
              ? "Enter your credentials to access your account"
              : step === 1
              ? "Fill in your details to get started"
              : "Check your email for a verification link"}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {successMessage && (
            <Alert variant="default" className="mb-4">
              <AlertTitle>Success</AlertTitle>
              <AlertDescription>{successMessage}</AlertDescription>
            </Alert>
          )}

          {step === 1 && (
            <form onSubmit={isForgotPassword ? handleForgotPasswordSubmit : handleSubmit} className="space-y-4">
              {!isLogin && !isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="username">Username</Label>
                  <Input
                    id="username"
                    type="text"
                    placeholder="johndoe"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
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
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              {!isForgotPassword && (
                <div className="space-y-2">
                  <Label htmlFor="password">Password</Label>
                  <Input
                    id="password"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    minLength={8}
                  />
                </div>
              )}

              <Button className="w-full" type="submit" disabled={isLoading}>
                {isLoading ? (
                  <>
                    <Icons.spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                    <span>{isLogin ? "Signing in..." : isForgotPassword ? "Sending reset link..." : "Creating account..."}</span>
                  </>
                ) : (
                  <span>{isLogin ? "Sign in" : isForgotPassword ? "Send Reset Link" : "Create account"}</span>
                )}
              </Button>

              {isLogin && !isForgotPassword && (
                <Button variant="link" className="w-full" onClick={() => setIsForgotPassword(true)} disabled={isLoading}>
                  <span>Forgot password?</span>
                </Button>
              )}

              {isForgotPassword && (
                <Button variant="link" className="w-full" onClick={() => setIsForgotPassword(false)} disabled={isLoading}>
                  <span>Back to login</span>
                </Button>
              )}
            </form>
          )}

          {step === 2 && (
            <div className="text-center space-y-4">
              <p>Weve sent a verification email to <strong>{email}</strong>.</p>
              <p>Please check your inbox and click on the verification link to complete your registration.</p>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          {!isForgotPassword && (
            <Button variant="outline" className="w-full" onClick={onGoogleAuth} disabled={isLoading}>
              <Icons.google className="mr-2 h-4 w-4" aria-hidden="true" />
              <span>Sign in with Google</span>
            </Button>
          )}

          {step === 1 && !isForgotPassword && (
            <Button variant="link" className="w-full" onClick={() => setIsLogin(!isLogin)} disabled={isLoading}>
              {isLogin ? "Don&apos;t have an account? Sign up" : "Already have an account? Sign in"}
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}