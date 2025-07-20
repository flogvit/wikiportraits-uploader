import { WikidataEntity } from '../types/wikidata';
import { RelationshipSuggestion, SuggestionContext } from './event-relationships';

/**
 * Advanced Local Caching System for Event Suggestions
 */

export interface CacheEntry<T> {
  data: T;
  timestamp: Date;
  expiry: Date;
  accessCount: number;
  lastAccessed: Date;
  metadata?: Record<string, any>;
}

export interface CacheStats {
  totalEntries: number;
  hitRate: number;
  totalHits: number;
  totalMisses: number;
  memoryUsage: number; // estimated bytes
  oldestEntry: Date | null;
  newestEntry: Date | null;
  entriesByType: Record<string, number>;
}

export interface CacheOptions {
  maxEntries?: number;
  defaultTTL?: number; // milliseconds
  cleanupInterval?: number; // milliseconds
  enableStats?: boolean;
  enableCompression?: boolean;
  persistToStorage?: boolean;
  storagePrefix?: string;
}

/**
 * Local Cache Manager for suggestions and relationships
 */
export class SuggestionCache {
  private cache: Map<string, CacheEntry<any>> = new Map();
  private stats = {
    hits: 0,
    misses: 0,
    totalRequests: 0
  };
  private cleanupTimer?: NodeJS.Timeout;
  private options: Required<CacheOptions>;

  constructor(options: CacheOptions = {}) {
    this.options = {
      maxEntries: 1000,
      defaultTTL: 60 * 60 * 1000, // 1 hour
      cleanupInterval: 15 * 60 * 1000, // 15 minutes
      enableStats: true,
      enableCompression: false,
      persistToStorage: true,
      storagePrefix: 'wpsuggestions_',
      ...options
    };

    this.startCleanupTimer();
    this.loadFromStorage();
  }

  /**
   * Get cached suggestions
   */
  getSuggestions(context: SuggestionContext): RelationshipSuggestion[] | null {
    const key = this.generateSuggestionKey(context);
    return this.get<RelationshipSuggestion[]>(key);
  }

  /**
   * Cache suggestions
   */
  setSuggestions(
    context: SuggestionContext, 
    suggestions: RelationshipSuggestion[],
    ttl?: number
  ): void {
    const key = this.generateSuggestionKey(context);
    this.set(key, suggestions, ttl, { type: 'suggestions', contextType: context.workflowType });
  }

  /**
   * Get cached entity data
   */
  getEntity(entityId: string): WikidataEntity | null {
    const key = `entity:${entityId}`;
    return this.get<WikidataEntity>(key);
  }

  /**
   * Cache entity data
   */
  setEntity(entity: WikidataEntity, ttl?: number): void {
    const key = `entity:${entity.id}`;
    this.set(key, entity, ttl, { type: 'entity', entityType: this.getEntityType(entity) });
  }

  /**
   * Get cached search results
   */
  getSearchResults(query: string, type: string): WikidataEntity[] | null {
    const key = `search:${type}:${this.hashString(query)}`;
    return this.get<WikidataEntity[]>(key);
  }

  /**
   * Cache search results
   */
  setSearchResults(query: string, type: string, results: WikidataEntity[], ttl?: number): void {
    const key = `search:${type}:${this.hashString(query)}`;
    this.set(key, results, ttl, { type: 'search', queryType: type });
  }

  /**
   * Generic get method
   */
  private get<T>(key: string): T | null {
    this.stats.totalRequests++;

    const entry = this.cache.get(key);
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check expiry
    if (new Date() > entry.expiry) {
      this.cache.delete(key);
      this.stats.misses++;
      return null;
    }

    // Update access stats
    entry.accessCount++;
    entry.lastAccessed = new Date();
    
    this.stats.hits++;
    return entry.data;
  }

  /**
   * Generic set method
   */
  private set<T>(key: string, data: T, ttl?: number, metadata?: Record<string, any>): void {
    const now = new Date();
    const expiry = new Date(now.getTime() + (ttl || this.options.defaultTTL));

    const entry: CacheEntry<T> = {
      data: this.options.enableCompression ? this.compress(data) : data,
      timestamp: now,
      expiry,
      accessCount: 0,
      lastAccessed: now,
      metadata
    };

    // Evict old entries if cache is full
    if (this.cache.size >= this.options.maxEntries) {
      this.evictLeastRecentlyUsed();
    }

    this.cache.set(key, entry);
    
    if (this.options.persistToStorage) {
      this.persistEntry(key, entry);
    }
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
    this.stats = { hits: 0, misses: 0, totalRequests: 0 };
    
    if (this.options.persistToStorage) {
      this.clearStorage();
    }
  }

  /**
   * Remove expired entries
   */
  cleanup(): void {
    const now = new Date();
    const expiredKeys: string[] = [];

    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiry) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => {
      this.cache.delete(key);
      if (this.options.persistToStorage) {
        this.removeFromStorage(key);
      }
    });

    if (expiredKeys.length > 0) {
      console.log(`Cleaned up ${expiredKeys.length} expired cache entries`);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const entries = Array.from(this.cache.entries());
    const entriesByType: Record<string, number> = {};
    let oldestEntry: Date | null = null;
    let newestEntry: Date | null = null;
    let totalMemoryUsage = 0;

    entries.forEach(([key, entry]) => {
      const type = entry.metadata?.type || 'unknown';
      entriesByType[type] = (entriesByType[type] || 0) + 1;

      if (!oldestEntry || entry.timestamp < oldestEntry) {
        oldestEntry = entry.timestamp;
      }
      if (!newestEntry || entry.timestamp > newestEntry) {
        newestEntry = entry.timestamp;
      }

      // Rough memory estimation
      totalMemoryUsage += JSON.stringify(entry).length * 2; // UTF-16 approximation
    });

    const hitRate = this.stats.totalRequests > 0 ? 
      this.stats.hits / this.stats.totalRequests : 0;

    return {
      totalEntries: this.cache.size,
      hitRate,
      totalHits: this.stats.hits,
      totalMisses: this.stats.misses,
      memoryUsage: totalMemoryUsage,
      oldestEntry,
      newestEntry,
      entriesByType
    };
  }

  /**
   * Prefetch suggestions for common workflows
   */
  async prefetchCommonSuggestions(): Promise<void> {
    const commonContexts: SuggestionContext[] = [
      { workflowType: 'music', userPreferences: { preferredGenres: ['rock', 'pop'] } },
      { workflowType: 'soccer', userPreferences: { preferredLocations: ['Germany', 'England'] } },
      { workflowType: 'general' }
    ];

    // This would typically make API calls to preload common suggestions
    // For now, we'll just log the prefetch attempt
    console.log('Prefetching suggestions for', commonContexts.length, 'common contexts');
  }

  /**
   * Export cache data
   */
  export(): string {
    const exportData = {
      cache: Array.from(this.cache.entries()),
      stats: this.stats,
      timestamp: new Date(),
      version: '1.0'
    };

    return JSON.stringify(exportData);
  }

  /**
   * Import cache data
   */
  import(data: string): boolean {
    try {
      const importData = JSON.parse(data);
      
      if (!importData.version || !importData.cache) {
        throw new Error('Invalid cache data format');
      }

      this.cache.clear();
      
      importData.cache.forEach(([key, entry]: [string, any]) => {
        // Reconstruct dates
        entry.timestamp = new Date(entry.timestamp);
        entry.expiry = new Date(entry.expiry);
        entry.lastAccessed = new Date(entry.lastAccessed);
        
        this.cache.set(key, entry);
      });

      this.stats = importData.stats || { hits: 0, misses: 0, totalRequests: 0 };
      
      return true;
    } catch (error) {
      console.error('Failed to import cache data:', error);
      return false;
    }
  }

  // Private helper methods

  private generateSuggestionKey(context: SuggestionContext): string {
    const keyData = {
      currentEvent: context.currentEvent?.id,
      existingEntities: context.existingEntities?.map(e => e.id).sort(),
      workflowType: context.workflowType,
      preferences: context.userPreferences
    };
    
    return `suggestions:${this.hashString(JSON.stringify(keyData))}`;
  }

  private getEntityType(entity: WikidataEntity): string {
    // Determine entity type from P31 (instance of) claims
    const instanceOf = entity.claims?.['P31']?.[0]?.mainsnak?.datavalue?.value?.id;
    
    switch (instanceOf) {
      case 'Q5': return 'person';
      case 'Q215627': return 'band';
      case 'Q132241': return 'music_festival';
      case 'Q182832': return 'concert';
      case 'Q16466': return 'soccer_match';
      default: return 'unknown';
    }
  }

  private hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(36);
  }

  private compress<T>(data: T): T {
    // In a real implementation, you might use a compression library
    // For now, we'll just return the data as-is
    return data;
  }

  private evictLeastRecentlyUsed(): void {
    let lruKey: string | null = null;
    let lruTime = new Date();

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < lruTime) {
        lruTime = entry.lastAccessed;
        lruKey = key;
      }
    }

    if (lruKey) {
      this.cache.delete(lruKey);
      if (this.options.persistToStorage) {
        this.removeFromStorage(lruKey);
      }
    }
  }

  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.options.cleanupInterval);
  }

  private loadFromStorage(): void {
    if (!this.options.persistToStorage || typeof localStorage === 'undefined') {
      return;
    }

    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.options.storagePrefix)
      );

      keys.forEach(storageKey => {
        const cacheKey = storageKey.replace(this.options.storagePrefix, '');
        const data = localStorage.getItem(storageKey);
        
        if (data) {
          const entry = JSON.parse(data);
          // Reconstruct dates
          entry.timestamp = new Date(entry.timestamp);
          entry.expiry = new Date(entry.expiry);
          entry.lastAccessed = new Date(entry.lastAccessed);
          
          // Only load if not expired
          if (new Date() <= entry.expiry) {
            this.cache.set(cacheKey, entry);
          }
        }
      });
    } catch (error) {
      console.error('Failed to load cache from storage:', error);
    }
  }

  private persistEntry(key: string, entry: CacheEntry<any>): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const storageKey = this.options.storagePrefix + key;
      localStorage.setItem(storageKey, JSON.stringify(entry));
    } catch (error) {
      console.error('Failed to persist cache entry:', error);
    }
  }

  private removeFromStorage(key: string): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const storageKey = this.options.storagePrefix + key;
      localStorage.removeItem(storageKey);
    } catch (error) {
      console.error('Failed to remove cache entry from storage:', error);
    }
  }

  private clearStorage(): void {
    if (typeof localStorage === 'undefined') return;

    try {
      const keys = Object.keys(localStorage).filter(key => 
        key.startsWith(this.options.storagePrefix)
      );
      keys.forEach(key => localStorage.removeItem(key));
    } catch (error) {
      console.error('Failed to clear cache storage:', error);
    }
  }

  /**
   * Clean up resources
   */
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// Global cache instance
export const suggestionCache = new SuggestionCache({
  maxEntries: 500,
  defaultTTL: 60 * 60 * 1000, // 1 hour
  enableStats: true,
  persistToStorage: true
});

export default suggestionCache;