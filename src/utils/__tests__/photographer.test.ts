import { generateAuthorField, getCurrentPhotographerQid } from '../photographer';
import * as ls from '../localStorage';

jest.mock('../localStorage', () => ({
  loadAuthorWikidataQid: jest.fn(),
}));

describe('photographer', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('generateAuthorField', () => {
    it('returns Wikidata link with name when both provided', () => {
      (ls.loadAuthorWikidataQid as jest.Mock).mockReturnValue('');
      expect(generateAuthorField('Q12345', 'John Doe')).toBe('[[d:Q12345|John Doe]]');
    });

    it('returns Wikidata link without name when only QID provided', () => {
      (ls.loadAuthorWikidataQid as jest.Mock).mockReturnValue('');
      expect(generateAuthorField('Q12345')).toBe('[[d:Q12345]]');
    });

    it('falls back to saved QID from localStorage', () => {
      (ls.loadAuthorWikidataQid as jest.Mock).mockReturnValue('Q999');
      expect(generateAuthorField(undefined, 'Jane')).toBe('[[d:Q999|Jane]]');
    });

    it('returns "Unknown photographer" when no QID available', () => {
      (ls.loadAuthorWikidataQid as jest.Mock).mockReturnValue('');
      expect(generateAuthorField()).toBe('Unknown photographer');
    });
  });

  describe('getCurrentPhotographerQid', () => {
    it('returns the saved QID', () => {
      (ls.loadAuthorWikidataQid as jest.Mock).mockReturnValue('Q555');
      expect(getCurrentPhotographerQid()).toBe('Q555');
    });

    it('returns empty string when nothing saved', () => {
      (ls.loadAuthorWikidataQid as jest.Mock).mockReturnValue('');
      expect(getCurrentPhotographerQid()).toBe('');
    });
  });
});
