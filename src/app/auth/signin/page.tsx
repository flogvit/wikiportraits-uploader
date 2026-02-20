'use client'

import { signIn, getSession } from 'next-auth/react'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { logger } from '@/utils/logger'

export default function SignIn() {
  const [isLoading, setIsLoading] = useState(false)
  const router = useRouter()

  useEffect(() => {
    getSession().then(session => {
      if (session) {
        router.push('/')
      }
    })
  }, [router])

  const handleSignIn = async () => {
    setIsLoading(true)
    try {
      await signIn('wikimedia', { 
        callbackUrl: '/',
        redirect: true 
      })
    } catch (error) {
      logger.error('signin', 'Sign in error', error)
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8">
        <div>
          <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
            WikiPortraits Bulk Uploader
          </h2>
          <p className="mt-2 text-center text-sm text-gray-600">
            Sign in with your Wikimedia account to upload images to Commons
          </p>
        </div>
        <div>
          <button
            onClick={handleSignIn}
            disabled={isLoading}
            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
            ) : (
              'Sign in with Wikimedia'
            )}
          </button>
        </div>
        <div className="text-center">
          <p className="text-xs text-gray-500">
            This application requires permissions to upload files to Wikimedia Commons
            and edit Wikidata. You will be redirected to Wikimedia&apos;s authorization page.
          </p>
        </div>
      </div>
    </div>
  )
}