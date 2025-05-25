'use client'

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Icons } from "./ui/icons"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface AuthFormProps {
  onGoogleAuth: () => Promise<void>
  error: string | null
}

export default function AuthForm({ onGoogleAuth, error: propError }: AuthFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(propError)
  const router = useRouter()

  useEffect(() => {
    if (propError) {
      setError(propError)
    }
  }, [propError])

  const handleGoogleAuth = async () => {
    setIsLoading(true)
    try {
      await onGoogleAuth()
    } catch (error) {
      console.error(error)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-black px-4 py-12 sm:px-6 lg:px-8">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">
            Welcome to Trackit
          </CardTitle>
          <CardDescription className="text-center">
            Sign in to access your account
          </CardDescription>
        </CardHeader>

        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}
        </CardContent>

        <CardFooter className="flex flex-col space-y-4">
          <Button
            variant="outline"
            className="w-full"
            onClick={handleGoogleAuth}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <Icons.spinner className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <Icons.google className="mr-2 h-4 w-4" aria-hidden="true" />
                <span>Sign in with Google</span>
              </>
            )}
          </Button>

          <Button variant="link" className="w-full" onClick={() => router.push("/")} disabled={isLoading}>
            <span>Go to Home</span>
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}