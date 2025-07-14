'use client';

import { Music, ExternalLink } from 'lucide-react';

interface UnifiedArtistResult {
  id: string;
  name: string;
  description?: string;
  country?: string;
  countryCode?: string;
  musicbrainzId?: string;
  formedYear?: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  isMusicRelated: boolean;
  entityType?: 'person' | 'group' | 'unknown';
  source: 'wikidata' | 'wikipedia';
  extract?: string;
}

interface ArtistResultsListProps {
  results: UnifiedArtistResult[];
  searchQuery: string;
  selectedLanguage: string;
  onResultSelect: (result: UnifiedArtistResult) => void;
  onManualEntry: () => void;
  showResults: boolean;
}

const languages = [
  { code: 'en', name: 'English', flag: '🇺🇸' },
  { code: 'no', name: 'Norwegian', flag: '🇳🇴' },
  { code: 'da', name: 'Danish', flag: '🇩🇰' },
  { code: 'sv', name: 'Swedish', flag: '🇸🇪' },
  { code: 'de', name: 'German', flag: '🇩🇪' },
  { code: 'fr', name: 'French', flag: '🇫🇷' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
  { code: 'it', name: 'Italian', flag: '🇮🇹' }
];

export default function ArtistResultsList({
  results,
  searchQuery,
  selectedLanguage,
  onResultSelect,
  onManualEntry,
  showResults
}: ArtistResultsListProps) {
  const selectedLang = languages.find(l => l.code === selectedLanguage);

  if (!showResults) return null;

  if (results.length > 0) {
    return (
      <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-10 max-h-80 overflow-y-auto">
        <div className="px-3 py-2 bg-muted border-b text-xs text-muted-foreground">
          🌐 Wikidata & {selectedLang?.flag} {selectedLang?.name} Wikipedia Results
        </div>
        {results.map((result) => (
          <button
            key={result.id}
            onMouseDown={(e) => {
              e.preventDefault();
              onResultSelect(result);
            }}
            className="w-full px-4 py-3 text-left hover:bg-muted border-b border-border last:border-b-0 focus:outline-none focus:bg-muted"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <div className="font-medium text-foreground">{result.name}</div>
                  {result.source === 'wikidata' && (
                    <span className="text-xs bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded">WD</span>
                  )}
                  {result.source === 'wikipedia' && (
                    <span className="text-xs bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded">WP</span>
                  )}
                </div>
                {(result.description || result.extract) && (
                  <div className="text-sm text-muted-foreground mt-1 line-clamp-2">
                    {result.description || result.extract}
                  </div>
                )}
                <div className="flex items-center gap-3 mt-1">
                  {result.isMusicRelated && (
                    <div className="flex items-center">
                      <Music className="w-3 h-3 text-accent mr-1" />
                      <span className="text-xs text-accent">Music</span>
                    </div>
                  )}
                  {result.country && (
                    <span className="text-xs text-muted-foreground">{result.country}</span>
                  )}
                  {result.formedYear && (
                    <span className="text-xs text-muted-foreground">{result.formedYear}</span>
                  )}
                  {result.entityType && (
                    <span className="text-xs text-muted-foreground capitalize">{result.entityType}</span>
                  )}
                </div>
              </div>
              <ExternalLink className="w-4 h-4 text-muted-foreground ml-2 flex-shrink-0" />
            </div>
          </button>
        ))}
        
        {searchQuery.trim() && (
          <button
            onMouseDown={(e) => {
              e.preventDefault();
              onManualEntry();
            }}
            className="w-full px-4 py-3 text-left hover:bg-accent/10 border-t border-border focus:outline-none focus:bg-accent/10"
          >
            <div className="flex items-center">
              <div className="w-8 h-8 bg-accent/20 rounded-md flex items-center justify-center mr-3">
                <Music className="w-4 h-4 text-accent" />
              </div>
              <div>
                <div className="font-medium text-foreground">Add &quot;{searchQuery}&quot;</div>
                <div className="text-sm text-muted-foreground">Add manually (no Wikipedia link)</div>
              </div>
            </div>
          </button>
        )}
      </div>
    );
  }

  if (searchQuery.length >= 2) {
    return (
      <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-10 p-4">
        <div className="text-sm text-muted-foreground text-center mb-3">No Wikipedia results found</div>
        <button
          onMouseDown={(e) => {
            e.preventDefault();
            onManualEntry();
          }}
          className="w-full px-4 py-2 bg-accent text-accent-foreground rounded-md hover:bg-accent/90 focus:outline-none focus:ring-2 focus:ring-accent"
        >
          Add &quot;{searchQuery}&quot; manually
        </button>
      </div>
    );
  }

  return null;
}