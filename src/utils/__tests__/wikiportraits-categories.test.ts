import {
  generateWikiPortraitsCategories,
  getWikiPortraitsCategoryName,
  extractEventNameWithoutYear,
} from '../wikiportraits-categories';

describe('wikiportraits-categories', () => {
  describe('generateWikiPortraitsCategories', () => {
    it('generates correct main category', () => {
      const result = generateWikiPortraitsCategories('TestFest', '2025');
      expect(result.mainCategory).toBe('WikiPortraits at 2025 TestFest');
    });

    it('generates correct year category', () => {
      const result = generateWikiPortraitsCategories('TestFest', '2025');
      expect(result.yearCategory).toBe('WikiPortraits in 2025');
    });

    it('generates correct type category for music events', () => {
      const result = generateWikiPortraitsCategories('TestFest', '2025');
      expect(result.typeCategory).toBe('WikiPortraits at music events');
    });

    it('generates correct type category for concerts', () => {
      const result = generateWikiPortraitsCategories('MyShow', '2024', 'concerts');
      expect(result.typeCategory).toBe('WikiPortraits at concerts');
    });

    it('generates correct type category for festivals', () => {
      const result = generateWikiPortraitsCategories('BigFest', '2024', 'festivals');
      expect(result.typeCategory).toBe('WikiPortraits at festivals');
    });

    it('returns 3 categories to create', () => {
      const result = generateWikiPortraitsCategories('TestFest', '2025');
      expect(result.categoriesToCreate).toHaveLength(3);
    });

    it('first category has correct parent and description', () => {
      const result = generateWikiPortraitsCategories('TestFest', '2025');
      const mainCat = result.categoriesToCreate[0];
      expect(mainCat.categoryName).toBe('WikiPortraits at 2025 TestFest');
      expect(mainCat.parentCategory).toBe('WikiPortraits in 2025');
      expect(mainCat.shouldCreate).toBe(true);
      expect(mainCat.additionalParents).toContain('WikiPortraits at music events');
    });
  });

  describe('getWikiPortraitsCategoryName', () => {
    it('returns formatted category name', () => {
      expect(getWikiPortraitsCategoryName('Roskilde', '2025')).toBe(
        'WikiPortraits at 2025 Roskilde'
      );
    });
  });

  describe('extractEventNameWithoutYear', () => {
    it('removes trailing year from event name', () => {
      expect(extractEventNameWithoutYear('Roskilde 2025')).toBe('Roskilde');
    });

    it('handles names without year', () => {
      expect(extractEventNameWithoutYear('Roskilde')).toBe('Roskilde');
    });

    it('only removes trailing year', () => {
      expect(extractEventNameWithoutYear('2025 Roskilde')).toBe('2025 Roskilde');
    });
  });
});
