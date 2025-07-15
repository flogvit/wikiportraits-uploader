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
}


export default function ArtistSearchInput({
  searchQuery,
  onSearchChange,
  placeholder = "Search for artist...",
  isSearching,
  selectedArtist,
  onClearSelection,
  onFocus
}: ArtistSearchInputProps) {
  return (
    <>
      <div className="mb-2">
        <label className="block text-sm font-medium text-muted-foreground">
          <Search className="w-4 h-4 inline mr-1" />
          Artist
        </label>
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
            Searching Wikidata...
          </div>
        </div>
      )}
    </>
  );
}