'use client'

import { useSession, signIn, signOut } from 'next-auth/react'
import { User, LogIn, LogOut } from 'lucide-react'
import { clearAuthorWikidataQid } from '@/utils/localStorage'
import Link from 'next/link'

export default function LoginButton() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="flex items-center space-x-2 px-4 py-2 bg-muted rounded-lg">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-muted-foreground"></div>
        <span className="text-sm text-muted-foreground">Loading...</span>
      </div>
    )
  }

  const handleSignOut = () => {
    clearAuthorWikidataQid();
    signOut();
  };

  if (session) {
    return (
      <div className="flex items-center space-x-4">
        <Link href="/profile">
          <div className="flex items-center space-x-2 px-3 py-2 bg-success/20 rounded-lg hover:bg-success/30 transition-colors cursor-pointer">
            <User className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              {session.user?.name}
            </span>
          </div>
        </Link>
        <button
          onClick={handleSignOut}
          className="flex items-center space-x-2 px-3 py-2 bg-destructive/20 hover:bg-destructive/30 rounded-lg transition-colors"
        >
          <LogOut className="h-4 w-4 text-destructive" />
          <span className="text-sm font-medium text-destructive">Sign Out</span>
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
      <span className="text-sm font-medium">Sign In with Personal Token</span>
    </button>
  )
}