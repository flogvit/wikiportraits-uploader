/**
 * Caching utility for Wikidata and Commons API lookups
 * Helps reduce API calls and improve performance
 */
import { logger } from '@/utils/logger';

interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

interface CacheStore {
  [key: string]: CacheEntry<any>;
}

// Cache duration: 24 hours (in milliseconds)
const CACHE_DURATION = 24 * 60 * 60 * 1000;

// Storage key for localStorage
const STORAGE_KEY = 'wikiportraits_lookup_cache';

class LookupCache {
  private cache: CacheStore = {};
  private listeners: Set<() => void> = new Set();

  constructor() {
    this.loadFromStorage();
  }

  /**
   * Subscribe to cache changes
   */
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /**
   * Notify all listeners of cache changes
   */
  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  /**
   * Load cache from localStorage
   */
  private loadFromStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        this.cache = JSON.parse(stored);
        // Clean up expired entries on load
        this.cleanupExpired();
      }
    } catch (error) {
      logger.error('lookup-cache', 'Error loading cache from storage', error);
      this.cache = {};
    }
  }

  /**
   * Save cache to localStorage
   */
  private saveToStorage(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.cache));
    } catch (error) {
      logger.error('lookup-cache', 'Error saving cache to storage', error);
    }
  }

  /**
   * Remove expired entries from cache
   */
  private cleanupExpired(): void {
    const now = Date.now();
    let cleaned = false;

    for (const key in this.cache) {
      if (now - this.cache[key].timestamp > CACHE_DURATION) {
        delete this.cache[key];
        cleaned = true;
      }
    }

    if (cleaned) {
      this.saveToStorage();
    }
  }

  /**
   * Generate cache key for different types of lookups
   */
  private generateKey(type: string, identifier: string): string {
    return `${type}:${identifier.toLowerCase()}`;
  }

  /**
   * Get cached data if available and not expired
   */
  get<T>(type: string, identifier: string): T | null {
    const key = this.generateKey(type, identifier);
    const entry = this.cache[key];

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > CACHE_DURATION) {
      delete this.cache[key];
      this.saveToStorage();
      return null;
    }

    return entry.data as T;
  }

  /**
   * Store data in cache
   */
  set<T>(type: string, identifier: string, data: T): void {
    const key = this.generateKey(type, identifier);
    this.cache[key] = {
      data,
      timestamp: Date.now()
    };
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Invalidate specific cache entry
   */
  invalidate(type: string, identifier: string): void {
    const key = this.generateKey(type, identifier);
    delete this.cache[key];
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Invalidate all entries of a specific type
   */
  invalidateType(type: string): void {
    let changed = false;
    for (const key in this.cache) {
      if (key.startsWith(`${type}:`)) {
        delete this.cache[key];
        changed = true;
      }
    }
    if (changed) {
      this.saveToStorage();
      this.notifyListeners();
    }
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.cache = {};
    this.saveToStorage();
    this.notifyListeners();
  }

  /**
   * Get cache statistics
   */
  getStats(): { totalEntries: number; typeBreakdown: Record<string, number> } {
    const typeBreakdown: Record<string, number> = {};
    let totalEntries = 0;

    for (const key in this.cache) {
      const type = key.split(':')[0];
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
      totalEntries++;
    }

    return { totalEntries, typeBreakdown };
  }
}

// Singleton instance
export const lookupCache = new LookupCache();

// Cache types for different lookups
export enum CacheType {
  WIKIDATA_ENTITY = 'wikidata-entity',
  WIKIDATA_SEARCH = 'wikidata-search',
  COMMONS_CATEGORY = 'commons-category',
  COMMONS_CATEGORY_EXISTS = 'commons-category-exists',
  WIKIDATA_ENTITY_EXISTS = 'wikidata-entity-exists',
}
