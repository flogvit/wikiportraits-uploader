import {
  yearToDate,
  dateToYear,
  yearInputToDate,
  isValidYearInput,
  isValidCompleteYear,
  wdDateToDate,
  dateToWdDate,
  getCurrentYear,
  formatDateForDisplay,
  createYearDate,
  isSameYear,
} from '../date-utils';

describe('date-utils', () => {
  describe('yearToDate', () => {
    it('converts a valid year number to a Date', () => {
      const d = yearToDate(2024);
      expect(d).toBeInstanceOf(Date);
      expect(d!.getFullYear()).toBe(2024);
      expect(d!.getMonth()).toBe(0);
      expect(d!.getDate()).toBe(1);
    });

    it('converts a valid year string to a Date', () => {
      const d = yearToDate('2020');
      expect(d).toBeInstanceOf(Date);
      expect(d!.getFullYear()).toBe(2020);
    });

    it('returns null for years before 1800', () => {
      expect(yearToDate(1799)).toBeNull();
    });

    it('returns null for years far in the future', () => {
      expect(yearToDate(new Date().getFullYear() + 11)).toBeNull();
    });

    it('returns null for NaN input', () => {
      expect(yearToDate('abc')).toBeNull();
    });
  });

  describe('dateToYear', () => {
    it('extracts year from a Date object', () => {
      expect(dateToYear(new Date(2023, 5, 15))).toBe(2023);
    });

    it('extracts year from a date string', () => {
      expect(dateToYear('2022-06-15')).toBe(2022);
    });

    it('returns null for null/undefined', () => {
      expect(dateToYear(null)).toBeNull();
      expect(dateToYear(undefined)).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(dateToYear('not-a-date')).toBeNull();
    });
  });

  describe('yearInputToDate', () => {
    it('converts a 4-digit year string to Date', () => {
      const d = yearInputToDate('2024');
      expect(d).toBeInstanceOf(Date);
      expect(d!.getFullYear()).toBe(2024);
    });

    it('returns null for short strings', () => {
      expect(yearInputToDate('202')).toBeNull();
    });

    it('returns null for empty string', () => {
      expect(yearInputToDate('')).toBeNull();
    });
  });

  describe('isValidYearInput', () => {
    it('accepts empty string', () => {
      expect(isValidYearInput('')).toBe(true);
    });

    it('accepts 1-4 digit strings', () => {
      expect(isValidYearInput('2')).toBe(true);
      expect(isValidYearInput('20')).toBe(true);
      expect(isValidYearInput('202')).toBe(true);
      expect(isValidYearInput('2024')).toBe(true);
    });

    it('rejects non-digit strings', () => {
      expect(isValidYearInput('abc')).toBe(false);
    });

    it('rejects 5-digit strings', () => {
      expect(isValidYearInput('20245')).toBe(false);
    });
  });

  describe('isValidCompleteYear', () => {
    it('returns true for a valid year', () => {
      expect(isValidCompleteYear(2024)).toBe(true);
      expect(isValidCompleteYear('2024')).toBe(true);
    });

    it('returns false for year <= 1800', () => {
      expect(isValidCompleteYear(1800)).toBe(false);
    });

    it('returns false for NaN', () => {
      expect(isValidCompleteYear('abc')).toBe(false);
    });
  });

  describe('wdDateToDate', () => {
    it('parses Wikidata date format', () => {
      const d = wdDateToDate('+2024-01-01T00:00:00Z');
      expect(d).toBeInstanceOf(Date);
      expect(d!.getFullYear()).toBe(2024);
    });

    it('returns null for empty string', () => {
      expect(wdDateToDate('')).toBeNull();
    });

    it('returns null for invalid date', () => {
      expect(wdDateToDate('not-a-date')).toBeNull();
    });
  });

  describe('dateToWdDate', () => {
    it('converts Date to Wikidata format', () => {
      const d = new Date(2024, 0, 15); // Jan 15, 2024
      expect(dateToWdDate(d)).toBe('+2024-01-15T00:00:00Z');
    });

    it('zero-pads month and day', () => {
      const d = new Date(2024, 2, 5); // Mar 5
      expect(dateToWdDate(d)).toBe('+2024-03-05T00:00:00Z');
    });
  });

  describe('getCurrentYear', () => {
    it('returns the current year as a number', () => {
      expect(getCurrentYear()).toBe(new Date().getFullYear());
    });
  });

  describe('formatDateForDisplay', () => {
    it('returns empty string for null', () => {
      expect(formatDateForDisplay(null)).toBe('');
    });

    it('returns empty string for invalid date', () => {
      expect(formatDateForDisplay('garbage')).toBe('');
    });

    it('formats as year by default', () => {
      expect(formatDateForDisplay(new Date(2024, 5, 15))).toBe('2024');
    });

    it('formats as month-year', () => {
      const result = formatDateForDisplay(new Date(2024, 0, 15), 'month-year');
      expect(result).toContain('2024');
      expect(result).toContain('January');
    });

    it('formats as full date', () => {
      const result = formatDateForDisplay(new Date(2024, 0, 15), 'full');
      expect(result).toContain('January');
      expect(result).toContain('15');
      expect(result).toContain('2024');
    });

    it('handles string input', () => {
      expect(formatDateForDisplay('2024-06-15', 'year')).toBe('2024');
    });
  });

  describe('createYearDate', () => {
    it('creates a Date for January 1st of the given year', () => {
      const d = createYearDate(2023);
      expect(d.getFullYear()).toBe(2023);
      expect(d.getMonth()).toBe(0);
      expect(d.getDate()).toBe(1);
    });
  });

  describe('isSameYear', () => {
    it('returns true for dates in the same year', () => {
      expect(isSameYear(new Date(2024, 0, 1), new Date(2024, 11, 31))).toBe(true);
    });

    it('returns false for dates in different years', () => {
      expect(isSameYear(new Date(2023, 0, 1), new Date(2024, 0, 1))).toBe(false);
    });

    it('returns false when either date is null', () => {
      expect(isSameYear(null, new Date())).toBe(false);
      expect(isSameYear(new Date(), null)).toBe(false);
    });
  });
});
