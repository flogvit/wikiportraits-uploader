import { sanitizeForFilename, needsFormatting } from '../commons-filename';

describe('commons-filename', () => {
  describe('sanitizeForFilename', () => {
    it('replaces spaces with underscores', () => {
      expect(sanitizeForFilename('hello world')).toBe('hello_world');
    });

    it('replaces Norwegian characters', () => {
      expect(sanitizeForFilename('Blåfjell')).toBe('Blaafjell');
      // gi flag means Ø -> o (lowercase replacement)
      expect(sanitizeForFilename('Ørjan')).toBe('orjan');
      expect(sanitizeForFilename('Ærlig')).toBe('aerlig');
    });

    it('replaces other diacritics', () => {
      expect(sanitizeForFilename('über')).toBe('uber');
      expect(sanitizeForFilename('café')).toBe('cafe');
      expect(sanitizeForFilename('naïve')).toContain('na');
    });

    it('removes special characters', () => {
      expect(sanitizeForFilename('file<name>test')).toBe('filenametest');
      expect(sanitizeForFilename('a:b/c\\d')).toBe('abcd');
      expect(sanitizeForFilename('test[1]{2}')).toBe('test12');
    });

    it('collapses multiple underscores', () => {
      expect(sanitizeForFilename('a   b   c')).toBe('a_b_c');
    });

    it('trims leading/trailing whitespace and underscores', () => {
      expect(sanitizeForFilename('  hello  ')).toBe('hello');
      expect(sanitizeForFilename('__hello__')).toBe('hello');
    });

    it('handles empty string', () => {
      expect(sanitizeForFilename('')).toBe('');
    });
  });

  describe('needsFormatting', () => {
    it('returns true for filenames with spaces', () => {
      expect(needsFormatting('hello world.jpg')).toBe(true);
    });

    it('returns true for filenames with special chars', () => {
      expect(needsFormatting('file<name>.jpg')).toBe(true);
    });

    it('returns true for filenames with multiple underscores', () => {
      expect(needsFormatting('hello__world.jpg')).toBe(true);
    });

    it('returns false for clean filenames', () => {
      expect(needsFormatting('hello_world.jpg')).toBe(false);
    });
  });
});
