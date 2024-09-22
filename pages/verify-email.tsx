import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import pb, { sendVerificationEmail } from '../utils/pocketbase'
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"

export default function VerifyEmail() {
  const router = useRouter()
  const [message, setMessage] = useState('Verifying your email...')
  const [isVerified, setIsVerified] = useState(false)
  const [email, setEmail] = useState('')

  useEffect(() => {
    const verifyEmail = async () => {
      const { token } = router.query

      if (token && typeof token === 'string') {
        try {
          await pb.collection('users').confirmVerification(token)
          setMessage('Email verified successfully.')
          setIsVerified(true)

          // Attempt to log in the user
          const authData = await pb.collection('users').authRefresh()
          if (authData) {
            const userId = pb.authStore.model?.id
            if (userId) {
              const user = await pb.collection('users').getOne(userId)
              setMessage(`Welcome, ${user.username || user.email}! Redirecting to dashboard...`)
              setTimeout(() => router.push('/dashboard'), 3000)
            } else {
              setMessage('Email verified, but user ID not found. Please log in manually.')
            }
          } else {
            setMessage('Email verified, but automatic login failed. Please log in manually.')
          }
        } catch (error) {
          console.error('Verification error:', error)
          setMessage('Email verification failed. Please try again or contact support.')
        }
      } else {
        setMessage('Invalid verification token. Please try the verification link again.')
      }
    }

    if (router.isReady) {
      verifyEmail()
    }
  }, [router])

  const handleResendVerification = async () => {
    if (email) {
      const sent = await sendVerificationEmail(email)
      if (sent) {
        setMessage('Verification email sent. Please check your inbox.')
      } else {
        setMessage('Failed to send verification email. Please try again.')
      }
    } else {
      setMessage('Please enter your email address.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center">Email Verification</CardTitle>
          <CardDescription className="text-center">{message}</CardDescription>
        </CardHeader>
        <CardContent>
          {isVerified ? (
            <p className="text-center text-green-600 dark:text-green-400">
              Your email has been successfully verified!
            </p>
          ) : (
            <div className="space-y-4">
              <p className="text-center">
                If you haven't received the verification email, you can request a new one:
              </p>
              <input
                type="email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-3 py-2 border rounded-md"
              />
              <Button onClick={handleResendVerification} className="w-full">
                Resend Verification Email
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter className="flex justify-center">
          <Button onClick={() => router.push('/login')} className="w-full max-w-xs">
            Go to Login
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}