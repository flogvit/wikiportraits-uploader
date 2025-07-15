'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Search } from 'lucide-react';
import { searchCountries, getCountryByName, type Country } from '@/utils/countries';

interface CountrySelectorProps {
  value: string;
  onChange: (country: string) => void;
  placeholder?: string;
  className?: string;
}

export default function CountrySelector({ 
  value, 
  onChange, 
  placeholder = "Select country...",
  className = ""
}: CountrySelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [filteredCountries, setFilteredCountries] = useState<Country[]>([]);
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Update search results when search term changes
  useEffect(() => {
    const results = searchCountries(search);
    setFilteredCountries(results);
    setHighlightedIndex(0);
  }, [search]);

  // Initialize with default results on mount
  useEffect(() => {
    setFilteredCountries(searchCountries(''));
  }, []);

  // Update filtered countries when dropdown opens/closes
  useEffect(() => {
    if (isOpen && filteredCountries.length === 0) {
      setFilteredCountries(searchCountries(''));
    }
  }, [isOpen, filteredCountries.length]);

  // Handle clicking outside to close dropdown
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearch('');
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen]);

  // Handle keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === 'ArrowDown') {
        setIsOpen(true);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev < filteredCountries.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => 
          prev > 0 ? prev - 1 : filteredCountries.length - 1
        );
        break;
      case 'Enter':
        e.preventDefault();
        if (filteredCountries[highlightedIndex]) {
          selectCountry(filteredCountries[highlightedIndex]);
        }
        break;
      case 'Escape':
        setIsOpen(false);
        setSearch('');
        inputRef.current?.blur();
        break;
    }
  };

  const selectCountry = (country: Country) => {
    onChange(country.name);
    setIsOpen(false);
    setSearch('');
    inputRef.current?.blur();
  };

  const handleInputClick = () => {
    setIsOpen(true);
    if (value) {
      setSearch('');
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    if (value) {
      setSearch('');
    }
  };

  const displayValue = value || '';
  const selectedCountry = getCountryByName(value);

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={isOpen ? search : displayValue}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={handleKeyDown}
          onClick={handleInputClick}
          onFocus={handleInputFocus}
          placeholder={placeholder}
          className="w-full px-3 py-2 pr-10 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-accent focus:border-accent text-foreground bg-card"
          autoComplete="off"
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
        >
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-card border border-border rounded-md shadow-lg max-h-60 overflow-auto">
          {search && (
            <div className="flex items-center px-3 py-2 text-sm text-muted-foreground border-b border-border">
              <Search className="w-4 h-4 mr-2" />
              Searching for &quot;{search}&quot;
            </div>
          )}
          
          {filteredCountries.length === 0 ? (
            <div className="px-3 py-2 text-sm text-muted-foreground">
              No countries found
            </div>
          ) : (
            filteredCountries.map((country, index) => (
              <button
                key={country.code}
                type="button"
                onMouseDown={(e) => {
                  e.preventDefault();
                  selectCountry(country);
                }}
                className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 focus:bg-gray-100 dark:focus:bg-gray-700 focus:outline-none ${
                  index === highlightedIndex ? 'bg-blue-100 dark:bg-blue-800 text-blue-900 dark:text-blue-100' : 'text-foreground'
                }`}
                onMouseEnter={() => setHighlightedIndex(index)}
              >
                <div className="flex items-center justify-between">
                  <span className="font-medium">{country.name}</span>
                  {country.language && (
                    <span className="text-xs text-muted-foreground uppercase">
                      {country.language}
                    </span>
                  )}
                </div>
                {/* Show flag emoji if available */}
                <div className="text-xs text-muted-foreground mt-1">
                  {country.code} • {country.wikidataId && `${country.wikidataId} • `}{country.searchTerms.slice(0, 3).join(', ')}
                </div>
              </button>
            ))
          )}
        </div>
      )}

      {/* Show selected country info */}
      {selectedCountry && !isOpen && (
        <div className="mt-1 text-xs text-muted-foreground">
          {selectedCountry.wikidataId && (
            <span>🗂️ Wikidata: {selectedCountry.wikidataId}</span>
          )}
          {selectedCountry.language && selectedCountry.wikidataId && <span> • </span>}
          {selectedCountry.language && (
            <span>🌐 Wikipedia language: {selectedCountry.language.toUpperCase()}</span>
          )}
        </div>
      )}
    </div>
  );
}