/**
 * IndexedDB-based image cache for persisting uploaded files across page reloads
 */

const DB_NAME = 'wikiportraits_images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

interface CachedImage {
  id: string;
  file: File;
  preview: string;
  metadata: any;
  timestamp: number;
}

class ImageCache {
  private db: IDBDatabase | null = null;
  private initPromise: Promise<void> | null = null;

  /**
   * Initialize IndexedDB
   */
  private async init(): Promise<void> {
    if (this.db) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        reject(new Error('IndexedDB not available (server-side)'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        reject(new Error('Failed to open IndexedDB'));
      };

      request.onsuccess = () => {
        this.db = request.result;
        resolve();
      };

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;

        // Create object store if it doesn't exist
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        }
      };
    });

    return this.initPromise;
  }

  /**
   * Save images to cache
   */
  async saveImages(images: CachedImage[]): Promise<void> {
    await this.init();
    if (!this.db) throw new Error('Database not initialized');

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);

      // Clear existing images first
      store.clear();

      // Add all images
      images.forEach((image) => {
        store.add(image);
      });

      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error);
    });
  }

  /**
   * Load images from cache
   */
  async loadImages(): Promise<CachedImage[]> {
    await this.init();
    if (!this.db) return [];

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readonly');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.getAll();

      request.onsuccess = () => {
        const images = request.result || [];
        // Sort by timestamp to maintain order
        images.sort((a, b) => a.timestamp - b.timestamp);
        resolve(images);
      };

      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Clear all cached images
   */
  async clearImages(): Promise<void> {
    await this.init();
    if (!this.db) return;

    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  }

  /**
   * Get cache size (approximate)
   */
  async getCacheSize(): Promise<{ count: number; estimatedBytes: number }> {
    const images = await this.loadImages();
    const estimatedBytes = images.reduce((sum, img) => sum + img.file.size, 0);
    return { count: images.length, estimatedBytes };
  }

  /**
   * Check if cache has images
   */
  async hasImages(): Promise<boolean> {
    const images = await this.loadImages();
    return images.length > 0;
  }
}

// Singleton instance
export const imageCache = new ImageCache();

/**
 * Format bytes to human-readable string
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
}
