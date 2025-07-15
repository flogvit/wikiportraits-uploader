'use client';

import { useState, useEffect, useCallback } from 'react';
import { useSession } from 'next-auth/react';
import { Search, User, Plus, Check, Camera, AlertCircle, ArrowLeft } from 'lucide-react';
import { saveAuthorWikidataQid, loadAuthorWikidataQid } from '@/utils/localStorage';
import LoginButton from '@/components/auth/LoginButton';
import { ThemeToggle } from '@/components/layout/ThemeToggle';
import CountrySelector from '@/components/selectors/CountrySelector';

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

interface PhotographerOnboardingProps {
  onComplete: (qid: string) => void;
}

interface PhotographerFormData {
  name: string;
  description: string;
  gender: string;
  nationality: string;
  website: string;
  wikimediaUsername: string;
}

export default function PhotographerOnboarding({ onComplete }: PhotographerOnboardingProps) {
  const { data: session } = useSession();
  const [step, setStep] = useState<'auto-search' | 'manual-search' | 'create-new'>('auto-search');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<WikidataEntity[] | null>(null);
  const [selectedPhotographer, setSelectedPhotographer] = useState<WikidataEntity | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [formData, setFormData] = useState<PhotographerFormData>({
    name: session?.user?.name || '',
    description: session?.user?.name ? `${session.user.name} is a photographer` : '',
    gender: '',
    nationality: '',
    website: '',
    wikimediaUsername: session?.user?.name || ''
  });

  // Auto-search for user based on session username
  const autoSearchUser = useCallback(async () => {
    if (!session?.user?.name) return;
    
    setIsSearching(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/wikidata/search?q=${encodeURIComponent(session.user.name)}&limit=5`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      const results = data.results || [];
      
      // Look for exact matches or photographer matches
      const exactMatch = results.find((r: WikidataEntity) => 
        r.label.toLowerCase() === session.user.name.toLowerCase() && (r.isPhotographer || r.isHuman)
      );
      
      const photographerMatch = results.find((r: WikidataEntity) => r.isPhotographer);
      
      if (exactMatch) {
        setSelectedPhotographer(exactMatch);
        setStep('manual-search'); // Show confirmation
      } else if (photographerMatch) {
        setSelectedPhotographer(photographerMatch);
        setStep('manual-search'); // Show confirmation
      } else {
        setStep('manual-search'); // No good match, let user search manually
      }
      
      setSearchResults(results);
    } catch (err) {
      console.error('Auto-search error:', err);
      setError('Failed to auto-search. Please search manually.');
      setStep('manual-search');
    } finally {
      setIsSearching(false);
    }
  }, [session?.user?.name]);

  // Manual search
  const searchWikidata = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
      setHasSearched(false);
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const response = await fetch(`/api/wikidata/search?q=${encodeURIComponent(query)}&limit=10`);
      
      if (!response.ok) {
        throw new Error(`Search failed: ${response.status}`);
      }

      const data = await response.json();
      setSearchResults(data.results || []);
      setHasSearched(true);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search Wikidata. Please try again.');
      setSearchResults([]);
      setHasSearched(true);
    } finally {
      setIsSearching(false);
    }
  };

  // Create new photographer
  const createNewPhotographer = async () => {
    if (!formData.name.trim()) {
      setError('Name is required');
      return;
    }
    
    setIsCreating(true);
    setError(null);
    
    try {
      const newPhotographer = {
        name: formData.name,
        description: formData.description || `${formData.name} is a photographer`,
        type: 'photographer',
        data: {
          gender: formData.gender,
          nationality: formData.nationality,
          website: formData.website,
          wikimediaUsername: formData.wikimediaUsername || session?.user?.name
        }
      };

      const requestBody = {
        entity: newPhotographer,
        accessToken: (session as any).accessToken
      };

      // Log the exact data that will be sent to the API
      console.log('=== PHOTOGRAPHER CREATION REQUEST ===');
      console.log('URL:', '/api/wikidata/create-entity');
      console.log('Method:', 'POST');
      console.log('Headers:', {
        'Content-Type': 'application/json',
      });
      console.log('Request Body:', JSON.stringify(requestBody, null, 2));
      console.log('Form Data:', formData);
      console.log('Session:', session);
      console.log('=====================================');
      
      const response = await fetch('/api/wikidata/create-entity', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`Creation failed: ${response.status}`);
      }
      
      const result = await response.json();
      console.log('API Response:', result);
      
      if (result.success) {
        const qid = result.wikidataId;
        console.log('Created photographer profile:', qid);
        if (result.wikidataUrl) {
          console.log('View on wikidata.org:', result.wikidataUrl);
        }
        saveAuthorWikidataQid(qid);
        onComplete(qid);
      } else {
        throw new Error(result.message || 'Failed to create photographer');
      }
    } catch (err) {
      console.error('Creation error:', err);
      setError('Failed to create photographer profile. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  // Confirm selection
  const confirmSelection = () => {
    if (selectedPhotographer) {
      saveAuthorWikidataQid(selectedPhotographer.id);
      onComplete(selectedPhotographer.id);
    }
  };

  // Start auto-search on mount
  useEffect(() => {
    // First check if already has Q-ID
    const existingQid = loadAuthorWikidataQid();
    if (existingQid) {
      onComplete(existingQid);
      return;
    }
    
    // Auto-search for user
    autoSearchUser();
  }, [autoSearchUser, onComplete]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchWikidata(searchTerm);
  };

  const handlePhotographerSelect = (photographer: WikidataEntity) => {
    setSelectedPhotographer(photographer);
  };

  if (step === 'auto-search') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">
                    WikiPortraits Bulk Uploader
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Upload and tag portrait images for Wikimedia Commons
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  <LoginButton />
                </div>
              </div>
            </header>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-md bg-card rounded-lg border border-border shadow-lg p-8">
                <div className="text-center">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h1 className="text-2xl font-bold mb-2">Setting up your photographer profile</h1>
                  <p className="text-muted-foreground mb-6">
                    We're searching for your photographer profile on Wikidata...
                  </p>
                  <div className="flex items-center justify-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                    <span className="ml-3 text-sm">Searching for {session?.user?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'create-new') {
    return (
      <div className="min-h-screen bg-background">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-6xl mx-auto">
            <header className="mb-8">
              <div className="flex justify-between items-center mb-6">
                <div>
                  <h1 className="text-4xl font-bold text-foreground mb-2">
                    WikiPortraits Bulk Uploader
                  </h1>
                  <p className="text-lg text-muted-foreground">
                    Upload and tag portrait images for Wikimedia Commons
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <ThemeToggle />
                  <LoginButton />
                </div>
              </div>
            </header>

            <div className="flex items-center justify-center">
              <div className="w-full max-w-2xl bg-card rounded-lg border border-border shadow-lg p-8">
                <div className="mb-6">
                  <button
                    onClick={() => setStep('manual-search')}
                    className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    <ArrowLeft className="h-4 w-4" />
                    Back to search
                  </button>
                </div>

                <div className="text-center mb-8">
                  <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
                  <h1 className="text-2xl font-bold mb-2">Create New Photographer Profile</h1>
                  <p className="text-muted-foreground">
                    Fill in the details to create a new photographer profile on Wikidata.
                  </p>
                </div>

                {error && (
                  <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                    <AlertCircle className="h-5 w-5 text-destructive" />
                    <span className="text-sm text-destructive">{error}</span>
                  </div>
                )}

                <form onSubmit={(e) => { e.preventDefault(); createNewPhotographer(); }} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="name" className="block text-sm font-medium mb-2">
                        Name <span className="text-destructive">*</span>
                      </label>
                      <input
                        type="text"
                        id="name"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                        placeholder="Your full name"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="gender" className="block text-sm font-medium mb-2">
                        Gender
                      </label>
                      <select
                        id="gender"
                        value={formData.gender}
                        onChange={(e) => setFormData(prev => ({ ...prev, gender: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                      >
                        <option value="">Select gender</option>
                        <option value="male">Male</option>
                        <option value="female">Female</option>
                        <option value="non-binary gender">Non-binary</option>
                        <option value="trans man">Trans man</option>
                        <option value="trans woman">Trans woman</option>
                        <option value="unknown">Prefer not to say</option>
                      </select>
                    </div>

                    <div>
                      <label htmlFor="nationality" className="block text-sm font-medium mb-2">
                        Nationality
                      </label>
                      <CountrySelector
                        value={formData.nationality}
                        onChange={(country) => setFormData(prev => ({ ...prev, nationality: country }))}
                        placeholder="Select your nationality..."
                        className="w-full"
                      />
                    </div>

                    <div>
                      <label htmlFor="wikimediaUsername" className="block text-sm font-medium mb-2">
                        Wikimedia Username
                      </label>
                      <input
                        type="text"
                        id="wikimediaUsername"
                        value={formData.wikimediaUsername}
                        onChange={(e) => setFormData(prev => ({ ...prev, wikimediaUsername: e.target.value }))}
                        className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                        placeholder="Your Wikimedia username"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="description" className="block text-sm font-medium mb-2">
                      Description
                    </label>
                    <textarea
                      id="description"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                      placeholder="Brief description of yourself as a photographer"
                    />
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-medium mb-2">
                      Website (optional)
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={formData.website}
                      onChange={(e) => setFormData(prev => ({ ...prev, website: e.target.value }))}
                      className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary bg-background"
                      placeholder="https://your-website.com"
                    />
                  </div>

                  <div className="pt-6 border-t border-border">
                    <button
                      type="submit"
                      disabled={isCreating || !formData.name.trim()}
                      className="w-full px-4 py-3 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      {isCreating ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary-foreground"></div>
                          Creating Profile...
                        </>
                      ) : (
                        <>
                          <Plus className="h-4 w-4" />
                          Create Photographer Profile
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h1 className="text-4xl font-bold text-foreground mb-2">
                  WikiPortraits Bulk Uploader
                </h1>
                <p className="text-lg text-muted-foreground">
                  Upload and tag portrait images for Wikimedia Commons
                </p>
              </div>
              <div className="flex items-center gap-4">
                <ThemeToggle />
                <LoginButton />
              </div>
            </div>
          </header>

          <div className="flex items-center justify-center">
            <div className="w-full max-w-2xl bg-card rounded-lg border border-border shadow-lg p-8">
              <div className="text-center mb-8">
                <Camera className="h-16 w-16 mx-auto mb-4 text-primary" />
                <h1 className="text-2xl font-bold mb-2">Complete your photographer profile</h1>
                <p className="text-muted-foreground">
                  To upload images, we need to link your account to a Wikidata photographer profile.
                </p>
              </div>

              {error && (
                <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md flex items-center gap-2">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <span className="text-sm text-destructive">{error}</span>
                </div>
              )}

              {selectedPhotographer && (
                <div className="mb-6 p-4 bg-primary/10 border border-primary/20 rounded-md">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-2">
                        <h3 className="font-semibold">{selectedPhotographer.label}</h3>
                        <span className="px-2 py-1 text-xs bg-muted rounded border">
                          {selectedPhotographer.id}
                        </span>
                        {selectedPhotographer.isPhotographer && (
                          <span className="px-2 py-1 text-xs bg-secondary rounded">
                            Photographer
                          </span>
                        )}
                      </div>
                      {selectedPhotographer.description && (
                        <p className="text-sm text-muted-foreground mb-2">
                          {selectedPhotographer.description}
                        </p>
                      )}
                      <a
                        href={selectedPhotographer.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-sm text-blue-600 hover:underline"
                      >
                        View on Wikidata
                      </a>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setSelectedPhotographer(null)}
                        className="px-3 py-1 text-sm border border-border rounded-md hover:bg-muted transition-colors"
                      >
                        Not me
                      </button>
                      <button
                        onClick={confirmSelection}
                        className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors flex items-center gap-2"
                      >
                        <Check className="h-4 w-4" />
                        This is me
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <form onSubmit={handleSearch} className="mb-6">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Search for your name on Wikidata..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    disabled={isSearching}
                    className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-background"
                  />
                  <button
                    type="submit"
                    disabled={isSearching || !searchTerm.trim()}
                    className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    <Search className="h-4 w-4" />
                    {isSearching ? 'Searching...' : 'Search'}
                  </button>
                </div>
              </form>

              {searchResults?.length > 0 && (
                <div className="mb-6">
                  <h4 className="font-medium text-sm mb-3">Search Results</h4>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {searchResults.map((result) => (
                      <div
                        key={result.id}
                        className="p-3 border border-border rounded-lg hover:bg-muted cursor-pointer"
                        onClick={() => handlePhotographerSelect(result)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{result.label}</span>
                              <span className="px-2 py-1 text-xs bg-muted rounded border">
                                {result.id}
                              </span>
                              {result.isPhotographer && (
                                <span className="px-2 py-1 text-xs bg-secondary rounded">
                                  Photographer
                                </span>
                              )}
                              {result.isHuman && !result.isPhotographer && (
                                <span className="px-2 py-1 text-xs bg-muted rounded border">
                                  Human
                                </span>
                              )}
                            </div>
                            {result.description && (
                              <p className="text-sm text-muted-foreground">{result.description}</p>
                            )}
                            {result.aliases && result.aliases.length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Also known as: {result.aliases.join(', ')}
                              </p>
                            )}
                          </div>
                          <Check className="h-4 w-4 text-success" />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {searchResults?.length === 0 && searchTerm && !isSearching && hasSearched && (
                <div className="mb-6 text-center py-8">
                  <div className="mb-4">
                    <p className="text-muted-foreground mb-2">
                      No photographers found for &quot;{searchTerm}&quot;
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Try searching with different spelling, alternative names, or create a new photographer profile below.
                    </p>
                  </div>
                </div>
              )}

              <div className="border-t border-border pt-6">
                <div className="text-center">
                  <p className="text-sm text-muted-foreground mb-4">
                    Can't find yourself? Create a new photographer profile.
                  </p>
                  <button
                    onClick={() => {
                      // Pre-populate name with search term if available
                      if (searchTerm.trim()) {
                        setFormData(prev => ({ 
                          ...prev, 
                          name: searchTerm,
                          description: `${searchTerm} is a photographer`
                        }));
                      }
                      setStep('create-new');
                    }}
                    className="flex items-center gap-2 mx-auto px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors"
                  >
                    <Plus className="h-4 w-4" />
                    Create New Photographer Profile
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}