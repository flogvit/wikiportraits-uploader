import { lookupCache, CacheType } from '../lookup-cache';

describe('lookup-cache', () => {
  beforeEach(() => {
    lookupCache.clear();
  });

  describe('get/set', () => {
    it('returns null for missing entries', () => {
      expect(lookupCache.get('test', 'missing')).toBeNull();
    });

    it('stores and retrieves data', () => {
      lookupCache.set('test', 'key1', { name: 'Alice' });
      expect(lookupCache.get('test', 'key1')).toEqual({ name: 'Alice' });
    });

    it('key is case-insensitive', () => {
      lookupCache.set('test', 'MyKey', 'value');
      expect(lookupCache.get('test', 'mykey')).toBe('value');
      expect(lookupCache.get('test', 'MYKEY')).toBe('value');
    });
  });

  describe('invalidate', () => {
    it('removes a specific entry', () => {
      lookupCache.set('test', 'key1', 'val1');
      lookupCache.set('test', 'key2', 'val2');
      lookupCache.invalidate('test', 'key1');
      expect(lookupCache.get('test', 'key1')).toBeNull();
      expect(lookupCache.get('test', 'key2')).toBe('val2');
    });
  });

  describe('invalidateType', () => {
    it('removes all entries of a type', () => {
      lookupCache.set('typeA', 'key1', 'val1');
      lookupCache.set('typeA', 'key2', 'val2');
      lookupCache.set('typeB', 'key3', 'val3');
      lookupCache.invalidateType('typeA');
      expect(lookupCache.get('typeA', 'key1')).toBeNull();
      expect(lookupCache.get('typeA', 'key2')).toBeNull();
      expect(lookupCache.get('typeB', 'key3')).toBe('val3');
    });
  });

  describe('clear', () => {
    it('removes all entries', () => {
      lookupCache.set('test', 'key1', 'val1');
      lookupCache.set('test', 'key2', 'val2');
      lookupCache.clear();
      expect(lookupCache.get('test', 'key1')).toBeNull();
      expect(lookupCache.get('test', 'key2')).toBeNull();
    });
  });

  describe('getStats', () => {
    it('returns correct stats', () => {
      lookupCache.set('typeA', 'k1', 'v1');
      lookupCache.set('typeA', 'k2', 'v2');
      lookupCache.set('typeB', 'k3', 'v3');
      const stats = lookupCache.getStats();
      expect(stats.totalEntries).toBe(3);
      expect(stats.typeBreakdown['typeA']).toBe(2);
      expect(stats.typeBreakdown['typeB']).toBe(1);
    });
  });

  describe('subscribe', () => {
    it('notifies listeners on set', () => {
      const listener = jest.fn();
      lookupCache.subscribe(listener);
      lookupCache.set('test', 'key', 'val');
      expect(listener).toHaveBeenCalled();
    });

    it('unsubscribe stops notifications', () => {
      const listener = jest.fn();
      const unsub = lookupCache.subscribe(listener);
      unsub();
      lookupCache.set('test', 'key', 'val');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('expired entries', () => {
    it('returns null for expired entries on get', () => {
      // Directly manipulate cache to simulate expired entry
      lookupCache.set('test', 'expKey', 'value');
      // Monkey-patch the timestamp to simulate expiration
      const cacheObj = (lookupCache as any).cache;
      const key = Object.keys(cacheObj).find(k => k.includes('expkey'));
      if (key) {
        cacheObj[key].timestamp = Date.now() - 25 * 60 * 60 * 1000; // 25 hours ago
      }
      expect(lookupCache.get('test', 'expKey')).toBeNull();
    });
  });

  describe('invalidateType with no matching entries', () => {
    it('does not notify when nothing to invalidate', () => {
      const listener = jest.fn();
      lookupCache.subscribe(listener);
      listener.mockClear();
      lookupCache.invalidateType('nonexistent');
      expect(listener).not.toHaveBeenCalled();
    });
  });

  describe('CacheType', () => {
    it('exports expected cache type constants', () => {
      expect(CacheType.WIKIDATA_ENTITY).toBe('wikidata-entity');
      expect(CacheType.WIKIDATA_SEARCH).toBe('wikidata-search');
      expect(CacheType.COMMONS_CATEGORY).toBe('commons-category');
      expect(CacheType.COMMONS_CATEGORY_EXISTS).toBe('commons-category-exists');
      expect(CacheType.WIKIDATA_ENTITY_EXISTS).toBe('wikidata-entity-exists');
    });
  });
});
