import {
  setItem,
  getItem,
  removeItem,
  setJsonItem,
  getJsonItem,
  saveBandMembers,
  loadBandMembers,
  saveSelectedPerformers,
  loadSelectedPerformers,
  clearPerformerData,
  saveAuthorWikidataQid,
  loadAuthorWikidataQid,
  clearAuthorWikidataQid,
  KEYS,
} from '../localStorage';

describe('localStorage utilities', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('setItem / getItem', () => {
    it('stores and retrieves a string', () => {
      setItem('key1', 'value1');
      expect(getItem('key1')).toBe('value1');
    });

    it('returns empty string for missing key', () => {
      expect(getItem('nonexistent')).toBe('');
    });
  });

  describe('removeItem', () => {
    it('removes an item', () => {
      setItem('key2', 'val');
      removeItem('key2');
      expect(getItem('key2')).toBe('');
    });
  });

  describe('setJsonItem / getJsonItem', () => {
    it('stores and retrieves JSON objects', () => {
      setJsonItem('obj', { a: 1, b: [2, 3] });
      expect(getJsonItem('obj', null)).toEqual({ a: 1, b: [2, 3] });
    });

    it('returns default for missing key', () => {
      expect(getJsonItem('missing', 'default')).toBe('default');
    });

    it('returns default for invalid JSON', () => {
      localStorage.setItem('bad', '{invalid');
      expect(getJsonItem('bad', 'fallback')).toBe('fallback');
    });
  });

  describe('band members', () => {
    it('saves and loads band members', () => {
      const members = [{ id: 'Q1', name: 'Alice' }];
      saveBandMembers('band1', members);
      expect(loadBandMembers('band1')).toEqual(members);
    });

    it('returns empty array for missing band', () => {
      expect(loadBandMembers('nonexistent')).toEqual([]);
    });

    it('handles empty bandId', () => {
      saveBandMembers('', [{ id: 'Q1' }]);
      expect(loadBandMembers('')).toEqual([]);
    });
  });

  describe('selected performers', () => {
    it('saves and loads selected performers', () => {
      const performers = [{ id: 'Q2', name: 'Bob' }];
      saveSelectedPerformers('band2', performers);
      expect(loadSelectedPerformers('band2')).toEqual(performers);
    });

    it('returns empty array for empty bandId', () => {
      expect(loadSelectedPerformers('')).toEqual([]);
    });
  });

  describe('clearPerformerData', () => {
    it('clears all performer data for a band', () => {
      saveBandMembers('band3', [{ id: 'Q1' }]);
      saveSelectedPerformers('band3', [{ id: 'Q2' }]);
      clearPerformerData('band3');
      expect(loadBandMembers('band3')).toEqual([]);
      expect(loadSelectedPerformers('band3')).toEqual([]);
    });

    it('does nothing for empty bandId', () => {
      clearPerformerData('');
      // Should not throw
    });
  });

  describe('author wikidata QID', () => {
    it('saves and loads QID', () => {
      saveAuthorWikidataQid('Q12345');
      expect(loadAuthorWikidataQid()).toBe('Q12345');
    });

    it('clears QID', () => {
      saveAuthorWikidataQid('Q12345');
      clearAuthorWikidataQid();
      expect(loadAuthorWikidataQid()).toBe('');
    });
  });

  describe('KEYS', () => {
    it('exports expected key constants', () => {
      expect(KEYS.AUTHOR_WIKIDATA_QID).toBe('author-wikidata-qid');
      expect(KEYS.FESTIVAL_NAME).toBeDefined();
      expect(KEYS.BAND_MEMBERS).toBeDefined();
    });
  });
});
