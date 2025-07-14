'use client';

import { Search } from 'lucide-react';

interface ArtistSearchInputProps {
  searchQuery: string;
  onSearchChange: (query: string) => void;
  placeholder?: string;
  isSearching: boolean;
  selectedArtist?: { name: string } | null;
  onClearSelection: () => void;
  onFocus: () => void;
  selectedLanguage: string;
  onLanguageChange: (language: string) => void;
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

export default function ArtistSearchInput({
  searchQuery,
  onSearchChange,
  placeholder = "Search for artist...",
  isSearching,
  selectedArtist,
  onClearSelection,
  onFocus,
  selectedLanguage,
  onLanguageChange
}: ArtistSearchInputProps) {
  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <label className="block text-sm font-medium text-muted-foreground">
          <Search className="w-4 h-4 inline mr-1" />
          Artist
        </label>
        <select
          value={selectedLanguage}
          onChange={(e) => onLanguageChange(e.target.value)}
          className="text-xs px-2 py-1 border border-border rounded focus:outline-none focus:ring-1 focus:ring-accent"
        >
          {languages.map((lang) => (
            <option key={lang.code} value={lang.code}>
              {lang.flag} {lang.name}
            </option>
          ))}
        </select>
      </div>
      
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent"
          onFocus={onFocus}
        />
        {selectedArtist?.name && (
          <button
            onClick={onClearSelection}
            className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            type="button"
          >
            ×
          </button>
        )}
      </div>

      {isSearching && (
        <div className="absolute top-full left-0 right-0 bg-card border border-border rounded-md shadow-lg z-10 p-2">
          <div className="text-sm text-muted-foreground text-center">
            Searching Wikidata & {languages.find(l => l.code === selectedLanguage)?.flag} {languages.find(l => l.code === selectedLanguage)?.name} Wikipedia...
          </div>
        </div>
      )}
    </>
  );
}