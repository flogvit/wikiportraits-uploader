/**
 * Date utility functions for handling various date conversions throughout the application
 */

/**
 * Converts a year string/number to a Date object (January 1st of that year)
 */
export function yearToDate(year: string | number): Date | null {
  const yearNum = typeof year === 'string' ? parseInt(year) : year;
  
  if (isNaN(yearNum) || yearNum < 1800 || yearNum > new Date().getFullYear() + 10) {
    return null;
  }
  
  return new Date(yearNum, 0, 1); // January 1st
}

/**
 * Extracts year from a Date object
 */
export function dateToYear(date: Date | string | null | undefined): number | null {
  if (!date) return null;
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  if (isNaN(dateObj.getTime())) return null;
  
  return dateObj.getFullYear();
}

/**
 * Converts year string input to Date for form storage
 * Returns null if invalid year
 */
export function yearInputToDate(yearInput: string): Date | null {
  if (!yearInput || yearInput.length !== 4) return null;
  return yearToDate(yearInput);
}

/**
 * Validates if a year string is valid for input (1-4 digits)
 */
export function isValidYearInput(yearInput: string): boolean {
  return yearInput === '' || /^\d{1,4}$/.test(yearInput);
}

/**
 * Validates if a complete year is within acceptable range
 */
export function isValidCompleteYear(year: string | number): boolean {
  const yearNum = typeof year === 'string' ? parseInt(year) : year;
  return !isNaN(yearNum) && yearNum > 1800 && yearNum <= new Date().getFullYear() + 10;
}

/**
 * Converts Wikidata date format to JavaScript Date
 * Wikidata dates are typically in format: "+2024-01-01T00:00:00Z"
 */
export function wdDateToDate(wdDate: string): Date | null {
  if (!wdDate) return null;
  
  // Remove leading + if present and parse
  const cleanDate = wdDate.replace(/^\+/, '');
  const date = new Date(cleanDate);
  
  return isNaN(date.getTime()) ? null : date;
}

/**
 * Converts JavaScript Date to Wikidata date format
 */
export function dateToWdDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  return `+${year}-${month}-${day}T00:00:00Z`;
}

/**
 * Gets current year as number
 */
export function getCurrentYear(): number {
  return new Date().getFullYear();
}

/**
 * Formats date for display (e.g., "2024", "January 2024", "January 1, 2024")
 */
export function formatDateForDisplay(date: Date | string | null, format: 'year' | 'month-year' | 'full' = 'year'): string {
  if (!date) return '';
  
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(dateObj.getTime())) return '';
  
  switch (format) {
    case 'year':
      return dateObj.getFullYear().toString();
    case 'month-year':
      return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
    case 'full':
      return dateObj.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    default:
      return dateObj.getFullYear().toString();
  }
}

/**
 * Creates a Date object for a specific year, defaulting to January 1st
 */
export function createYearDate(year: number): Date {
  return new Date(year, 0, 1);
}

/**
 * Checks if two dates represent the same year
 */
export function isSameYear(date1: Date | null, date2: Date | null): boolean {
  if (!date1 || !date2) return false;
  return date1.getFullYear() === date2.getFullYear();
}