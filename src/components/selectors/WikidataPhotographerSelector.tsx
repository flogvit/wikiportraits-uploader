'use client';

import { useState, useEffect, useCallback } from 'react';
import { Search, User, Plus, Check } from 'lucide-react';
import { saveAuthorWikidataQid, loadAuthorWikidataQid, clearAuthorWikidataQid } from '@/utils/localStorage';

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

interface WikidataPhotographerSelectorProps {
  onPhotographerSelect: (photographer: WikidataEntity | null) => void;
  initialValue?: string;
  disabled?: boolean;
}

export default function WikidataPhotographerSelector({
  onPhotographerSelect,
  initialValue,
  disabled = false
}: WikidataPhotographerSelectorProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<WikidataEntity[] | null>(null);
  const [selectedPhotographer, setSelectedPhotographer] = useState<WikidataEntity | null>(null);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchEntityDetails = useCallback(async (qid: string) => {
    try {
      const response = await fetch(`/api/wikidata/get-entity?id=${qid}`);
      if (response.ok) {
        const entity = await response.json();
        setSelectedPhotographer(entity);
        onPhotographerSelect(entity);
      }
    } catch (error) {
      console.error('Error fetching entity details:', error);
    }
  }, [onPhotographerSelect]);

  // Load saved Q-ID on mount
  useEffect(() => {
    const savedQid = loadAuthorWikidataQid();
    if (savedQid && !selectedPhotographer) {
      // Fetch entity details for saved Q-ID
      fetchEntityDetails(savedQid);
    }
  }, [fetchEntityDetails, selectedPhotographer]);

  // Handle initial value
  useEffect(() => {
    if (initialValue && !selectedPhotographer) {
      fetchEntityDetails(initialValue);
    }
  }, [initialValue, fetchEntityDetails, selectedPhotographer]);

  const searchWikidata = async (query: string) => {
    if (!query.trim()) {
      setSearchResults(null);
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
      console.log('Search response:', data);
      console.log('Results array:', data.results);
      console.log('Results length:', data.results?.length);
      setSearchResults(data.results || []);
    } catch (err) {
      console.error('Search error:', err);
      setError('Failed to search Wikidata. Please try again.');
      setSearchResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    searchWikidata(searchTerm);
  };

  const handlePhotographerSelect = (photographer: WikidataEntity) => {
    setSelectedPhotographer(photographer);
    onPhotographerSelect(photographer);
    saveAuthorWikidataQid(photographer.id);
    setSearchResults(null);
    setSearchTerm('');
  };

  const handleClear = () => {
    setSelectedPhotographer(null);
    onPhotographerSelect(null);
    clearAuthorWikidataQid();
    setSearchResults(null);
    setSearchTerm('');
  };

  const handleCreateNew = () => {
    // TODO: Implement create new photographer functionality
    console.log('Create new photographer not yet implemented');
  };

  if (selectedPhotographer) {
    return (
      <div className="w-full bg-card rounded-lg border border-border shadow-sm">
        <div className="p-4 border-b border-border">
          <div className="flex items-center gap-2">
            <User className="h-5 w-5" />
            <h3 className="font-semibold">Selected Photographer</h3>
          </div>
        </div>
        <div className="p-4">
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
            <button
              onClick={handleClear}
              disabled={disabled}
              className="px-3 py-1 text-sm border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              Change
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full bg-card rounded-lg border border-border shadow-sm">
      <div className="p-4 border-b border-border">
        <div className="flex items-center gap-2">
          <Search className="h-5 w-5" />
          <h3 className="font-semibold">Find Photographer on Wikidata</h3>
        </div>
      </div>
      <div className="p-4">
        <form onSubmit={handleSearch} className="mb-4">
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Search for photographer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              disabled={disabled || isSearching}
              className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-background"
            />
            <button
              type="submit"
              disabled={disabled || isSearching || !searchTerm.trim()}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
            >
              {isSearching ? 'Searching...' : 'Search'}
            </button>
          </div>
        </form>

        {error && (
          <div className="text-destructive text-sm mb-4">
            {error}
          </div>
        )}

        {searchResults?.length > 0 && (
          <div className="space-y-2">
            <h4 className="font-medium text-sm">Search Results</h4>
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

        {(() => {
          const shouldShow = searchResults?.length === 0 && searchTerm && !isSearching;
          console.log('No results condition:', {
            searchResultsLength: searchResults?.length,
            searchTerm,
            isSearching,
            shouldShow
          });
          return shouldShow;
        })() && (
          <div className="text-center py-8">
            <div className="mb-4">
              <p className="text-muted-foreground mb-2">
                No photographers found for &quot;{searchTerm}&quot;
              </p>
              <p className="text-sm text-muted-foreground">
                Try searching with different spelling, alternative names, or create a new photographer entry.
              </p>
            </div>
            <button
              onClick={handleCreateNew}
              disabled={disabled}
              className="flex items-center gap-2 px-4 py-2 border border-border rounded-md hover:bg-muted transition-colors disabled:opacity-50"
            >
              <Plus className="h-4 w-4" />
              Create New Photographer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}