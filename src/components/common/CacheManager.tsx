'use client';

import { useState, useEffect } from 'react';
import { Trash2, RefreshCw, Database } from 'lucide-react';
import { lookupCache } from '@/utils/lookup-cache';
import { imageCache, formatBytes } from '@/utils/image-cache';

export default function CacheManager() {
  const [stats, setStats] = useState(lookupCache.getStats());
  const [imageStats, setImageStats] = useState<{ count: number; estimatedBytes: number }>({ count: 0, estimatedBytes: 0 });
  const [showDetails, setShowDetails] = useState(false);

  // Subscribe to cache changes
  useEffect(() => {
    const unsubscribe = lookupCache.subscribe(() => {
      setStats(lookupCache.getStats());
    });
    return unsubscribe;
  }, []);

  const refreshStats = async () => {
    setStats(lookupCache.getStats());
    try {
      const imgStats = await imageCache.getCacheSize();
      setImageStats(imgStats);
    } catch (error) {
      console.warn('Failed to get image cache stats:', error);
    }
  };

  // Load image stats on mount and when details open
  useEffect(() => {
    if (showDetails) {
      refreshStats();
    }
  }, [showDetails]);

  const handleClearCache = async () => {
    if (confirm('Are you sure you want to clear all cached data? This will cause the next lookup to fetch fresh data from Wikidata and Commons.')) {
      lookupCache.clear();
      await refreshStats();
    }
  };

  const handleClearImages = async () => {
    if (confirm('Are you sure you want to clear all cached images? You will need to re-upload them.')) {
      try {
        await imageCache.clearImages();
        await refreshStats();
      } catch (error) {
        console.error('Failed to clear images:', error);
      }
    }
  };

  return (
    <div className="relative">
      <button
        onClick={() => setShowDetails(!showDetails)}
        className="flex items-center gap-2 px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-md transition-colors"
        title="Cache Manager"
      >
        <Database className="w-4 h-4" />
        <span>{stats.totalEntries} cached</span>
      </button>

      {showDetails && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-card border border-border rounded-lg shadow-lg p-4 z-50">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-card-foreground">Cache Manager</h3>
            <button
              onClick={() => setShowDetails(false)}
              className="text-muted-foreground hover:text-card-foreground"
            >
              ×
            </button>
          </div>

          <div className="space-y-3">
            <div className="text-sm">
              <p className="text-muted-foreground mb-2">
                Caching reduces API calls and preserves your work across sessions.
              </p>
              <div className="bg-muted/30 rounded p-2 space-y-2">
                <div>
                  <p className="font-semibold">API Cache</p>
                  <p className="text-xs text-muted-foreground">Total entries: {stats.totalEntries}</p>
                  {Object.entries(stats.typeBreakdown).map(([type, count]) => (
                    <p key={type} className="text-xs text-muted-foreground pl-2">
                      • {type}: {count}
                    </p>
                  ))}
                </div>
                <div className="border-t border-border pt-2">
                  <p className="font-semibold">Image Cache</p>
                  <p className="text-xs text-muted-foreground">
                    {imageStats.count} images ({formatBytes(imageStats.estimatedBytes)})
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex gap-2">
                <button
                  onClick={() => { refreshStats(); }}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh
                </button>
                <button
                  onClick={handleClearCache}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm bg-red-100 text-red-700 rounded-md hover:bg-red-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear API
                </button>
              </div>
              {imageStats.count > 0 && (
                <button
                  onClick={handleClearImages}
                  className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Images ({imageStats.count})
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
