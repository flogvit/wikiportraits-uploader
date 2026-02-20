/**
 * Configuration storage using IndexedDB with localStorage fallback
 * Handles user preferences and workflow settings
 */

import { UserConfiguration, DEFAULT_CONFIGURATION } from '@/types/configuration';
import { logger } from '@/utils/logger';

const DB_NAME = 'wikiportraits-config';
const DB_VERSION = 1;
const STORE_NAME = 'configuration';
const LOCALSTORAGE_KEY = 'wikiportraits-config';

/**
 * Initialize IndexedDB
 */
async function initDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;

      // Create object store if it doesn't exist
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
  });
}

/**
 * Save configuration to IndexedDB
 */
async function saveToIndexedDB(config: UserConfiguration): Promise<void> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);

    const configWithId = {
      id: 'user-config',
      ...config,
      lastModified: new Date()
    };

    return new Promise((resolve, reject) => {
      const request = store.put(configWithId);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('configuration-storage', 'IndexedDB save failed, falling back to localStorage', error);
    saveToLocalStorage(config);
  }
}

/**
 * Load configuration from IndexedDB
 */
async function loadFromIndexedDB(): Promise<UserConfiguration | null> {
  try {
    const db = await initDB();
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);

    return new Promise((resolve, reject) => {
      const request = store.get('user-config');
      request.onsuccess = () => {
        const result = request.result;
        if (result) {
          // Remove the id field before returning
          const { id, ...config } = result;
          resolve(config as UserConfiguration);
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    logger.error('configuration-storage', 'IndexedDB load failed, falling back to localStorage', error);
    return loadFromLocalStorage();
  }
}

/**
 * Save configuration to localStorage (fallback)
 */
function saveToLocalStorage(config: UserConfiguration): void {
  try {
    const configWithDate = {
      ...config,
      lastModified: new Date().toISOString()
    };
    localStorage.setItem(LOCALSTORAGE_KEY, JSON.stringify(configWithDate));
  } catch (error) {
    logger.error('configuration-storage', 'Failed to save configuration to localStorage', error);
  }
}

/**
 * Load configuration from localStorage (fallback)
 */
function loadFromLocalStorage(): UserConfiguration | null {
  try {
    const stored = localStorage.getItem(LOCALSTORAGE_KEY);
    if (!stored) return null;

    const config = JSON.parse(stored);
    // Convert lastModified back to Date
    if (config.lastModified) {
      config.lastModified = new Date(config.lastModified);
    }
    return config;
  } catch (error) {
    logger.error('configuration-storage', 'Failed to load configuration from localStorage', error);
    return null;
  }
}

/**
 * Save user configuration
 */
export async function saveConfiguration(config: UserConfiguration): Promise<void> {
  // Save to both IndexedDB (primary) and localStorage (fallback)
  await saveToIndexedDB(config);
  saveToLocalStorage(config);
}

/**
 * Load user configuration
 * Returns default configuration if none exists
 */
export async function loadConfiguration(): Promise<UserConfiguration> {
  // Try IndexedDB first
  const config = await loadFromIndexedDB();

  if (config) {
    // Merge with defaults to ensure new fields are present
    return mergeWithDefaults(config);
  }

  // Return default configuration
  return DEFAULT_CONFIGURATION;
}

/**
 * Merge loaded config with defaults (for migration/new fields)
 */
function mergeWithDefaults(config: UserConfiguration): UserConfiguration {
  return {
    ...DEFAULT_CONFIGURATION,
    ...config,
    global: {
      categories: { ...DEFAULT_CONFIGURATION.global.categories, ...config.global?.categories },
      permissions: { ...DEFAULT_CONFIGURATION.global.permissions, ...config.global?.permissions },
      workflow: { ...DEFAULT_CONFIGURATION.global.workflow, ...config.global?.workflow },
      wikiportraits: { ...DEFAULT_CONFIGURATION.global.wikiportraits, ...config.global?.wikiportraits },
      depicts: { ...DEFAULT_CONFIGURATION.global.depicts, ...config.global?.depicts }
    },
    eventTypeOverrides: config.eventTypeOverrides || {}
  };
}

/**
 * Update specific configuration section
 */
export async function updateConfiguration(
  section: keyof UserConfiguration['global'],
  updates: any
): Promise<void> {
  const config = await loadConfiguration();
  config.global[section] = { ...config.global[section], ...updates };
  await saveConfiguration(config);
}

/**
 * Reset configuration to defaults
 */
export async function resetConfiguration(): Promise<void> {
  await saveConfiguration(DEFAULT_CONFIGURATION);
}

/**
 * Export configuration as JSON (for backup)
 */
export async function exportConfiguration(): Promise<string> {
  const config = await loadConfiguration();
  return JSON.stringify(config, null, 2);
}

/**
 * Import configuration from JSON
 */
export async function importConfiguration(json: string): Promise<void> {
  try {
    const config = JSON.parse(json);
    // Validate it has required fields
    if (!config.version || !config.global) {
      throw new Error('Invalid configuration format');
    }
    await saveConfiguration(mergeWithDefaults(config));
  } catch (error) {
    throw new Error('Failed to import configuration: ' + (error instanceof Error ? error.message : 'Invalid JSON'));
  }
}

/**
 * Get configuration for specific event type
 * Merges global config with event-type overrides
 */
export async function getEventTypeConfiguration(
  eventType: string
): Promise<UserConfiguration['global']> {
  const config = await loadConfiguration();
  const overrides = config.eventTypeOverrides[eventType] || {};

  return {
    categories: { ...config.global.categories, ...overrides.categories },
    permissions: { ...config.global.permissions, ...overrides.permissions },
    workflow: { ...config.global.workflow, ...overrides.workflow },
    wikiportraits: { ...config.global.wikiportraits, ...overrides.wikiportraits },
    depicts: { ...config.global.depicts, ...overrides.depicts }
  };
}
