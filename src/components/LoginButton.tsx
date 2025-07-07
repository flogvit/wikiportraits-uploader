'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { User, LogIn, LogOut } from 'lucide-react'

export default function LoginButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-gray-100 rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        <span className="text-sm text-gray-600">Loading...</span>
      </div>
    )
  }

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <div className="flex items-center space-x-2 px-3 py-2 bg-green-100 rounded-lg">
          <User className="h-4 w-4 text-green-600" />
          <span className="text-sm font-medium text-green-800">
            {session.user?.name}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="flex items-center space-x-2 px-3 py-2 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 text-red-600" />
          <span className="text-sm font-medium text-red-800">Sign Out</span>
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={() => signIn('wikimedia')}
      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
    >
      <LogIn className="h-4 w-4" />
      <span className="text-sm font-medium">Sign In with Wikimedia</span>
    </button>
  )
}