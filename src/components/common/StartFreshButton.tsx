'use client';

import { RotateCcw } from 'lucide-react';
import { imageCache } from '@/utils/image-cache';
import { lookupCache } from '@/utils/lookup-cache';
import { logger } from '@/utils/logger';

export default function StartFreshButton() {
  const handleStartFresh = async () => {
    const confirmed = confirm(
      '🔄 Start Fresh?\n\n' +
      'This will clear:\n' +
      '• All uploaded images\n' +
      '• Event details\n' +
      '• Categories\n' +
      '• Wikidata entities\n' +
      '• All workflow progress\n' +
      '• API cache\n\n' +
      'Your login will be preserved.\n\n' +
      'Are you sure?'
    );

    if (!confirmed) return;

    try {
      // Clear images from IndexedDB
      await imageCache.clearImages();
      logger.info('StartFreshButton', 'Cleared images from IndexedDB');

      // Clear API cache
      lookupCache.clear();
      logger.info('StartFreshButton', 'Cleared API cache from localStorage');

      // Clear form data from localStorage
      if (typeof window !== 'undefined') {
        // Find and remove all universal-form keys
        const keysToRemove: string[] = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && key.startsWith('universal-form-')) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        logger.info('StartFreshButton', 'Cleared form data from localStorage');
      }

      // Reload page to ensure clean state
      window.location.reload();
    } catch (error) {
      logger.error('StartFreshButton', 'Error starting fresh', error);
      alert('Failed to clear data. Please try again or clear your browser cache manually.');
    }
  };

  return (
    <button
      onClick={handleStartFresh}
      className="flex items-center gap-2 px-3 py-2 text-sm bg-green-100 text-green-700 hover:bg-green-200 rounded-md transition-colors"
      title="Start a new event from scratch"
    >
      <RotateCcw className="w-4 h-4" />
      <span className="hidden sm:inline">Start Fresh</span>
    </button>
  );
}
