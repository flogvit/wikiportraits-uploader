'use client';

import { useSession } from 'next-auth/react';
import { useState, useEffect } from 'react';
import { loadAuthorWikidataQid } from '@/utils/localStorage';
import LoginButton from '@/components/auth/LoginButton';
import PhotographerOnboarding from '@/components/auth/PhotographerOnboarding';
import { Camera } from 'lucide-react';

interface AuthWrapperProps {
  children: React.ReactNode;
}

export default function AuthWrapper({ children }: AuthWrapperProps) {
  const { status } = useSession();
  const [needsOnboarding, setNeedsOnboarding] = useState(true);
  const [isCheckingOnboarding, setIsCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (status === 'loading') return;
    
    if (status === 'unauthenticated') {
      setIsCheckingOnboarding(false);
      return;
    }
    
    if (status === 'authenticated') {
      // Check if user has completed photographer onboarding
      const qid = loadAuthorWikidataQid();
      if (qid) {
        setNeedsOnboarding(false);
      } else {
        setNeedsOnboarding(true);
      }
      setIsCheckingOnboarding(false);
    }
  }, [status]);

  const handleOnboardingComplete = (qid: string) => {
    console.log('Onboarding completed with Q-ID:', qid);
    setNeedsOnboarding(false);
  };

  // Loading state
  if (status === 'loading' || isCheckingOnboarding) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-sm text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (status === 'unauthenticated') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8">
          <div className="text-center mb-8">
            <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
            <h1 className="text-2xl font-bold mb-2">WikiPortraits</h1>
            <p className="text-muted-foreground">
              Upload and organize your photography on Wikimedia Commons
            </p>
          </div>
          
          <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-md">
            <h3 className="font-semibold text-amber-800 mb-2">Authentication Required</h3>
            <p className="text-sm text-amber-700">
              You must sign in with your Wikimedia account to upload images. 
              Only upload images that you personally took.
            </p>
          </div>
          
          <div className="flex justify-center">
            <LoginButton />
          </div>
        </div>
      </div>
    );
  }

  // Authenticated but needs photographer onboarding
  if (needsOnboarding) {
    return (
      <PhotographerOnboarding onComplete={handleOnboardingComplete} />
    );
  }

  // Authenticated and onboarded - show main app
  return <>{children}</>;
}