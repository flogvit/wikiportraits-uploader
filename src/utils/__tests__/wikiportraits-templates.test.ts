import {
  generateStandardWikiPortraitsTemplate,
  generateTemplateParameters,
  getStandardTemplateName,
  getTemplateCreationSummary,
  getYearFromDate,
} from '../wikiportraits-templates';

describe('wikiportraits-templates', () => {
  describe('generateStandardWikiPortraitsTemplate', () => {
    it('returns a string containing WikiPortraits', () => {
      const result = generateStandardWikiPortraitsTemplate();
      expect(result).toContain('WikiPortraits');
    });

    it('includes includeonly section', () => {
      const result = generateStandardWikiPortraitsTemplate();
      expect(result).toContain('<includeonly>');
      expect(result).toContain('</includeonly>');
    });

    it('includes noinclude documentation tag', () => {
      const result = generateStandardWikiPortraitsTemplate();
      expect(result).toContain('<noinclude>');
      expect(result).toContain('{{Documentation}}');
    });
  });

  describe('generateTemplateParameters', () => {
    it('generates template with event and year parameters', () => {
      const result = generateTemplateParameters(
        { title: 'TestFest' },
        2025
      );
      expect(result).toContain('event=TestFest');
      expect(result).toContain('year=2025');
    });

    it('strips trailing year from event name', () => {
      const result = generateTemplateParameters(
        { title: 'TestFest 2025' },
        2025
      );
      expect(result).toContain('event=TestFest');
      expect(result).not.toContain('event=TestFest 2025');
    });

    it('extracts page name from Wikipedia URL', () => {
      const result = generateTemplateParameters(
        { title: 'TestFest', wikipediaUrl: 'https://en.wikipedia.org/wiki/TestFest_2025' },
        2025
      );
      expect(result).toContain('page=TestFest_2025');
    });

    it('uses default language en', () => {
      const result = generateTemplateParameters({ title: 'Fest' }, 2025);
      expect(result).toContain('lang=en');
    });

    it('uses specified language', () => {
      const result = generateTemplateParameters(
        { title: 'Fest', language: 'no' },
        2025
      );
      expect(result).toContain('lang=no');
    });
  });

  describe('getStandardTemplateName', () => {
    it('returns WikiPortraits_uploader', () => {
      expect(getStandardTemplateName()).toBe('WikiPortraits_uploader');
    });
  });

  describe('getTemplateCreationSummary', () => {
    it('returns summary with event name', () => {
      expect(getTemplateCreationSummary('Roskilde')).toContain('Roskilde');
    });
  });

  describe('getYearFromDate', () => {
    it('extracts year from Date object', () => {
      expect(getYearFromDate(new Date(2025, 5, 15))).toBe('2025');
    });

    it('extracts year from date string', () => {
      expect(getYearFromDate('2024-06-15')).toBe('2024');
    });
  });
});
