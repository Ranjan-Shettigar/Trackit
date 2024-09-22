import { useEffect } from 'react'
import { useRouter } from 'next/router'
import pb from '../../utils/pocketbase'

export default function AuthCallback() {
  const router = useRouter()

  useEffect(() => {
    const { code, state, error } = router.query

    if (error) {
      console.error('OAuth error:', error)
      router.push('/')
      return
    }

    if (code && state) {
      // http://127.0.0.1:8090/api/oauth2-redirect
      pb.collection('users').authWithOAuth2Code('google', code.toString(), state.toString(), 'https://trackit.pockethost.io/api/oauth2-redirect')    
        .then(() => {
          router.push('/')
        })
        .catch((err) => {
          console.error('OAuth authentication error:', err)
          router.push('/')
        })
    }
  }, [router])

  return <div>Processing authentication...</div>
}