'use client';

import { useState, useEffect, useRef } from 'react';
import { Search, Loader, Check, X } from 'lucide-react';
import { SoccerTeam } from './SoccerMatchWorkflow';

interface TeamSelectorProps {
  onTeamSelect: (team: SoccerTeam) => void;
  selectedTeam?: SoccerTeam | null;
  placeholder?: string;
  label?: string;
}

interface WikipediaSearchResult {
  id: string;
  title: string;
  description: string;
  url: string;
  wikipedia_url: string;
  isFootballTeam?: boolean;
  extract?: string;
}

export default function TeamSelector({ onTeamSelect, selectedTeam, placeholder = "Search for a football team...", label }: TeamSelectorProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WikipediaSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!query.trim() || query.length < 2) {
      setResults([]);
      return;
    }

    const timeoutId = setTimeout(async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const response = await fetch(`/api/wikipedia/search?q=${encodeURIComponent(query)}&category=teams&limit=10`);
        if (!response.ok) {
          throw new Error('Search failed');
        }
        
        const data = await response.json();
        setResults(data.results || []);
        setIsOpen(true);
      } catch (err) {
        setError('Failed to search for teams');
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Handle clicks outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleTeamSelect = (result: WikipediaSearchResult) => {
    const team: SoccerTeam = {
      id: result.id,
      name: result.title,
      wikipediaUrl: result.wikipedia_url
    };
    
    onTeamSelect(team);
    setQuery(result.title);
    setIsOpen(false);
    setResults([]);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setIsOpen(false);
    if (selectedTeam) {
      onTeamSelect({} as SoccerTeam); // Clear selection
    }
    inputRef.current?.focus();
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    
    if (!value.trim()) {
      setResults([]);
      setIsOpen(false);
    }
  };

  return (
    <div className="relative" ref={searchRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {label}
        </label>
      )}
      
      <div className="relative">
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          <Search className="w-5 h-5 text-gray-400" />
        </div>
        
        <input
          ref={inputRef}
          type="text"
          value={selectedTeam ? selectedTeam.name : query}
          onChange={handleInputChange}
          onFocus={() => {
            if (results.length > 0) setIsOpen(true);
          }}
          placeholder={placeholder}
          className="w-full pl-10 pr-10 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
        />
        
        <div className="absolute inset-y-0 right-0 flex items-center pr-3">
          {isLoading ? (
            <Loader className="w-5 h-5 text-gray-400 animate-spin" />
          ) : selectedTeam ? (
            <div className="flex items-center space-x-1">
              <Check className="w-5 h-5 text-green-500" />
              <button
                onClick={handleClear}
                className="text-gray-400 hover:text-gray-600 focus:outline-none"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {/* Dropdown */}
      {isOpen && (results.length > 0 || error) && (
        <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {error ? (
            <div className="p-3 text-sm text-red-600">
              {error}
            </div>
          ) : (
            <ul className="py-1">
              {results.map((result) => (
                <li key={result.id}>
                  <button
                    onClick={() => handleTeamSelect(result)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                  >
                    <div className="font-medium text-gray-900">
                      {result.title}
                    </div>
                    {(result.extract || result.description) && (
                      <div className="text-sm text-gray-600 mt-1 line-clamp-2">
                        {result.extract || result.description}
                      </div>
                    )}
                    {result.isFootballTeam && (
                      <div className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 mt-1">
                        Football Club
                      </div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}