'use client';

import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { User, ExternalLink, Edit, Settings, Camera, Globe, Link as LinkIcon, ArrowLeft, Home } from 'lucide-react';
import { loadAuthorWikidataQid } from '@/utils/localStorage';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import LoginButton from '@/components/auth/LoginButton';

interface WikidataEntity {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
  conceptUri: string;
  url: string;
  isHuman?: boolean;
  isPhotographer?: boolean;
}

export default function ProfilePage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [photographerQid, setPhotographerQid] = useState<string | null>(null);
  const [photographerData, setPhotographerData] = useState<WikidataEntity | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/');
      return;
    }

    if (status === 'authenticated') {
      const qid = loadAuthorWikidataQid();
      setPhotographerQid(qid);
      
      if (qid) {
        fetchPhotographerData(qid);
      } else {
        setIsLoading(false);
      }
    }
  }, [status, router]);

  const fetchPhotographerData = async (qid: string) => {
    try {
      console.log('Fetching photographer data for Q-ID:', qid);
      const response = await fetch(`/api/wikidata/get-entity?id=${qid}`);
      if (response.ok) {
        const data = await response.json();
        console.log('Photographer data received:', data);
        setPhotographerData(data);
      } else {
        const errorData = await response.json();
        console.error('API error:', errorData);
        setError(`Failed to fetch photographer data: ${errorData.error || 'Unknown error'}`);
      }
    } catch (err) {
      console.error('Fetch error:', err);
      setError('Error loading photographer profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleEditProfile = () => {
    // TODO: Implement edit profile functionality
    console.log('Edit profile clicked');
  };

  const handleManagePhotos = () => {
    router.push('/');
  };

  if (status === 'loading' || isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center min-h-[50vh]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <header className="mb-8">
            <div className="mb-4">
              <button
                onClick={() => router.push('/')}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </button>
            </div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6">
              <div className="flex-1">
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground mb-2">
                  User Profile
                </h1>
                <p className="text-muted-foreground">
                  Manage your photographer profile and settings
                </p>
              </div>
              <div className="flex items-center gap-4 sm:flex-shrink-0">
                <ThemeToggle />
                <LoginButton />
              </div>
            </div>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Main Profile Card */}
            <div className="lg:col-span-2">
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <div className="flex items-start justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center">
                      <Camera className="w-8 h-8 text-primary" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-bold">{session.user?.name}</h2>
                      <p className="text-muted-foreground">Photographer</p>
                    </div>
                  </div>
                  <button
                    onClick={handleEditProfile}
                    className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Profile
                  </button>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
                    <p className="text-sm text-destructive">{error}</p>
                  </div>
                )}

                {/* Wikidata Integration Status */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Wikidata Integration</h3>
                  {photographerQid ? (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between p-4 bg-success/10 border border-success/20 rounded-md">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-success/20 rounded-full flex items-center justify-center">
                            <User className="w-4 h-4 text-success" />
                          </div>
                          <div>
                            <p className="font-medium">Connected to Wikidata</p>
                            <p className="text-sm text-muted-foreground">Q-ID: {photographerQid}</p>
                          </div>
                        </div>
                        <a
                          href={`https://www.wikidata.org/wiki/${photographerQid}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-2 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                        >
                          <ExternalLink className="w-4 h-4" />
                          View on Wikidata
                        </a>
                      </div>

                      {photographerData ? (
                        <div className="p-4 border border-border rounded-md">
                          {photographerData.label === photographerData.id ? (
                            <div className="mb-3">
                              <h4 className="font-semibold mb-2 text-warning">Profile Incomplete</h4>
                              <p className="text-sm text-muted-foreground mb-2">
                                This Wikidata entity ({photographerData.id}) exists but needs to be populated with proper data.
                              </p>
                              <p className="text-xs text-muted-foreground">
                                The entity was created but may not have been properly filled with labels, descriptions, or claims.
                              </p>
                            </div>
                          ) : (
                            <div>
                              <h4 className="font-semibold mb-2">{photographerData.label}</h4>
                              {photographerData.description && (
                                <p className="text-sm text-muted-foreground mb-2">
                                  {photographerData.description}
                                </p>
                              )}
                              {photographerData.aliases && photographerData.aliases.length > 0 && (
                                <p className="text-xs text-muted-foreground mb-2">
                                  Also known as: {photographerData.aliases.join(', ')}
                                </p>
                              )}
                            </div>
                          )}
                          
                          <div className="mt-3 flex flex-wrap gap-2">
                            {photographerData.isHuman && (
                              <span className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded">
                                Human
                              </span>
                            )}
                            {photographerData.isPhotographer && (
                              <span className="px-2 py-1 text-xs bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200 rounded">
                                Photographer
                              </span>
                            )}
                            {!photographerData.isHuman && !photographerData.isPhotographer && (
                              <span className="px-2 py-1 text-xs bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200 rounded">
                                Missing Claims
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div className="p-4 border border-border rounded-md">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary"></div>
                            <span className="text-sm">Loading Wikidata profile...</span>
                          </div>
                          <p className="text-xs text-muted-foreground">
                            Fetching data from Wikidata for {photographerQid}
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="p-4 bg-warning/10 border border-warning/20 rounded-md">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-warning/20 rounded-full flex items-center justify-center">
                          <Settings className="w-4 h-4 text-warning" />
                        </div>
                        <div>
                          <p className="font-medium">No Wikidata Profile</p>
                          <p className="text-sm text-muted-foreground">
                            Complete your photographer profile setup to upload images
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Account Information */}
                <div className="mb-6">
                  <h3 className="text-lg font-semibold mb-4">Account Information</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 border border-border rounded-md">
                      <h4 className="font-medium mb-2">Username</h4>
                      <p className="text-sm text-muted-foreground">{session.user?.name}</p>
                    </div>
                    <div className="p-4 border border-border rounded-md">
                      <h4 className="font-medium mb-2">Email</h4>
                      <p className="text-sm text-muted-foreground">{session.user?.email || 'Not available'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Sidebar */}
            <div className="space-y-6">
              {/* Quick Actions */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Quick Actions</h3>
                <div className="space-y-3">
                  <button
                    onClick={handleManagePhotos}
                    className="w-full flex items-center gap-3 px-4 py-3 text-left border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    <Home className="w-5 h-5" />
                    <div>
                      <p className="font-medium">Go to Dashboard</p>
                      <p className="text-sm text-muted-foreground">Upload photos and manage workflow</p>
                    </div>
                  </button>
                  
                  {photographerQid && (
                    <a
                      href={`https://www.wikidata.org/wiki/${photographerQid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="w-full flex items-center gap-3 px-4 py-3 text-left border border-border rounded-md hover:bg-muted transition-colors"
                    >
                      <Globe className="w-5 h-5" />
                      <div>
                        <p className="font-medium">View Wikidata Profile</p>
                        <p className="text-sm text-muted-foreground">See your public profile</p>
                      </div>
                    </a>
                  )}
                </div>
              </div>

              {/* Application Info */}
              <div className="bg-card rounded-lg border border-border shadow-sm p-6">
                <h3 className="text-lg font-semibold mb-4">Application</h3>
                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Version</span>
                    <span>1.0.0</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">OAuth App</span>
                    <span>wikiportraits uploader</span>
                  </div>
                  <div className="pt-3 border-t border-border">
                    <a
                      href="https://github.com/flogvit/wikiportraits-uploader"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      <LinkIcon className="w-4 w-4" />
                      GitHub Repository
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}