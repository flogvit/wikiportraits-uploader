'use client';

import { useState } from 'react';
import { Plus, X, Globe } from 'lucide-react';
import { Caption } from '@/types/upload';

interface CaptionEditorProps {
  captions: Caption[];
  onUpdate: (captions: Caption[]) => void;
  suggestedCaption?: string; // Auto-generated suggestion (single language)
  suggestedCaptions?: Caption[]; // Auto-generated multilingual captions
}

const COMMON_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'no', name: 'Norwegian' },
  { code: 'nb', name: 'Norwegian Bokmål' },
  { code: 'nn', name: 'Norwegian Nynorsk' },
  { code: 'de', name: 'German' },
  { code: 'fr', name: 'French' },
  { code: 'es', name: 'Spanish' },
  { code: 'it', name: 'Italian' },
  { code: 'pt', name: 'Portuguese' },
  { code: 'nl', name: 'Dutch' },
  { code: 'pl', name: 'Polish' },
  { code: 'ru', name: 'Russian' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' },
  { code: 'ar', name: 'Arabic' },
  { code: 'hi', name: 'Hindi' },
  { code: 'sv', name: 'Swedish' },
  { code: 'da', name: 'Danish' },
  { code: 'fi', name: 'Finnish' },
  { code: 'cs', name: 'Czech' },
  { code: 'hu', name: 'Hungarian' },
  { code: 'ro', name: 'Romanian' },
  { code: 'tr', name: 'Turkish' },
  { code: 'el', name: 'Greek' },
  { code: 'he', name: 'Hebrew' },
  { code: 'ko', name: 'Korean' },
  { code: 'uk', name: 'Ukrainian' },
  { code: 'vi', name: 'Vietnamese' },
  { code: 'th', name: 'Thai' },
  { code: 'id', name: 'Indonesian' },
];

export default function CaptionEditor({ captions, onUpdate, suggestedCaption, suggestedCaptions }: CaptionEditorProps) {
  const [newLanguage, setNewLanguage] = useState('en');
  const [newText, setNewText] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  const handleAddCaption = () => {
    if (newText.trim() && newLanguage) {
      // Check if this language already exists
      const existingIndex = captions.findIndex(c => c.language === newLanguage);

      if (existingIndex >= 0) {
        // Update existing caption
        const updated = [...captions];
        updated[existingIndex] = { language: newLanguage, text: newText.trim() };
        onUpdate(updated);
      } else {
        // Add new caption
        onUpdate([...captions, { language: newLanguage, text: newText.trim() }]);
      }

      setNewText('');
      setShowAddForm(false);
    }
  };

  const handleRemoveCaption = (language: string) => {
    onUpdate(captions.filter(c => c.language !== language));
  };

  const getLanguageName = (code: string) => {
    return COMMON_LANGUAGES.find(l => l.code === code)?.name || code;
  };

  // Auto-generate captions in multiple languages
  const handleUseSuggestion = () => {
    // Use pre-generated multilingual captions if available
    if (suggestedCaptions && suggestedCaptions.length > 0) {
      const newCaptions = [...captions];

      suggestedCaptions.forEach(suggested => {
        const existingCaption = newCaptions.find(c => c.language === suggested.language);

        // Only add if doesn't exist
        if (!existingCaption) {
          newCaptions.push(suggested);
        }
      });

      onUpdate(newCaptions);
      return;
    }

    // Fallback to single caption for all languages if no translations available
    if (!suggestedCaption) return;

    // Languages to auto-generate (most common on Commons)
    const autoLanguages = ['en', 'nb', 'nn', 'de', 'fr', 'es'];

    const newCaptions = [...captions];

    autoLanguages.forEach(lang => {
      const existingCaption = newCaptions.find(c => c.language === lang);

      // Only add if doesn't exist
      if (!existingCaption) {
        newCaptions.push({
          language: lang,
          text: suggestedCaption // Same text for all languages - user will need to translate
        });
      }
    });

    onUpdate(newCaptions);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="block text-sm font-medium text-card-foreground flex items-center gap-2">
          <Globe className="w-4 h-4" />
          Captions (Structured Data)
        </label>
        {!showAddForm && (
          <button
            onClick={() => setShowAddForm(true)}
            className="text-xs text-primary hover:text-primary/80 flex items-center gap-1"
          >
            <Plus className="w-3 h-3" />
            Add Caption
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Short descriptions that appear in search results and when embedded. Separate from the full wikitext description.
      </p>

      {/* Suggested caption */}
      {((suggestedCaptions && suggestedCaptions.length > 0) || suggestedCaption) && captions.length === 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
          <p className="text-xs text-blue-700 mb-2">Suggested caption:</p>
          <p className="text-sm text-blue-900 mb-2">
            {suggestedCaptions && suggestedCaptions.length > 0
              ? suggestedCaptions.find(c => c.language === 'en')?.text || suggestedCaptions[0]?.text
              : suggestedCaption}
          </p>
          <button
            onClick={handleUseSuggestion}
            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
          >
            {suggestedCaptions && suggestedCaptions.length > 0
              ? `Add in ${suggestedCaptions.length} languages with translations`
              : 'Add in 6 languages (EN, NB, NN, DE, FR, ES)'}
          </button>
          <p className="text-xs text-blue-600 mt-2">
            {suggestedCaptions && suggestedCaptions.length > 0
              ? 'Captions are automatically translated (connector words like "with"/"at" in each language)'
              : 'You can edit each language after adding'}
          </p>
        </div>
      )}

      {/* Existing captions */}
      {captions.length > 0 && (
        <div className="space-y-2">
          {captions.map((caption, index) => (
            <div key={index} className="flex items-start gap-2 p-2 bg-muted rounded border border-border">
              <div className="flex-1">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  {getLanguageName(caption.language)} ({caption.language})
                </div>
                <div className="text-sm text-card-foreground">
                  {caption.text}
                </div>
              </div>
              <button
                onClick={() => handleRemoveCaption(caption.language)}
                className="text-muted-foreground hover:text-destructive p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add caption form */}
      {showAddForm && (
        <div className="border border-border rounded-lg p-3 bg-card space-y-3">
          <div>
            <label className="block text-xs font-medium text-card-foreground mb-1">
              Language
            </label>
            <select
              value={newLanguage}
              onChange={(e) => setNewLanguage(e.target.value)}
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            >
              {COMMON_LANGUAGES.map(lang => (
                <option key={lang.code} value={lang.code}>
                  {lang.name} ({lang.code})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-card-foreground mb-1">
              Caption Text
            </label>
            <input
              type="text"
              value={newText}
              onChange={(e) => setNewText(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCaption();
                }
              }}
              placeholder="Short description (e.g., Band at Festival 2025)"
              className="w-full px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary"
              autoFocus
            />
            <p className="text-xs text-muted-foreground mt-1">
              Keep it short - captions should be 1-2 lines max
            </p>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleAddCaption}
              disabled={!newText.trim()}
              className="flex-1 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed text-sm"
            >
              Add Caption
            </button>
            <button
              onClick={() => {
                setShowAddForm(false);
                setNewText('');
              }}
              className="px-3 py-2 border border-border rounded-md hover:bg-muted text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
