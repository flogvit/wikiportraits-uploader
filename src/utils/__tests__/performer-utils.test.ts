import { flattenPerformer, flattenPerformers, getPerformerVariant } from '../performer-utils';

describe('performer-utils', () => {
  describe('flattenPerformer', () => {
    it('converts WikidataEntity format with labels', () => {
      const performer = {
        id: 'Q123',
        labels: { en: { value: 'Alice' } },
        claims: {},
        metadata: { instruments: ['guitar'], nationality: 'Norwegian' },
        new: false,
      };
      const result = flattenPerformer(performer);
      expect(result.id).toBe('Q123');
      expect(result.name).toBe('Alice');
      expect(result.instruments).toEqual(['guitar']);
      expect(result.nationality).toBe('Norwegian');
    });

    it('handles WikidataEntity with no metadata instruments, falls back to empty', () => {
      const performer = {
        id: 'Q100',
        labels: { en: { value: 'Empty' } },
        claims: { P1303: [] },
        metadata: {},
        new: false,
      };
      const result = flattenPerformer(performer);
      expect(result.instruments).toEqual([]);
    });

    it('handles P1303 claims without instrument IDs', () => {
      const performer = {
        id: 'Q101',
        labels: { en: { value: 'NoId' } },
        claims: {
          P1303: [
            { mainsnak: { datavalue: { value: {} } } },
            { mainsnak: {} },
          ],
        },
        metadata: {},
        new: false,
      };
      const result = flattenPerformer(performer);
      expect(result.instruments).toEqual([]);
    });

    it('handles band member type in metadata', () => {
      const performer = {
        id: 'Q102',
        labels: { en: { value: 'Member' } },
        claims: {},
        metadata: { isBandMember: true, wikidataUrl: 'http://wd/Q102', wikipediaUrl: 'http://wp/Member', imageUrl: 'http://img', birthDate: '1990-01-01' },
        new: true,
      };
      const result = flattenPerformer(performer);
      expect(result.type).toBe('band_member');
      expect(result.new).toBe(true);
      expect(result.wikidataUrl).toBe('http://wd/Q102');
    });

    it('extracts instruments from P1303 claims', () => {
      const performer = {
        id: 'Q456',
        labels: { en: { value: 'Bob' } },
        claims: {
          P1303: [
            { mainsnak: { datavalue: { value: { id: 'guitar' } } } },
            { mainsnak: { datavalue: { value: { id: 'piano' } } } },
          ],
        },
        metadata: {},
        new: false,
      };
      const result = flattenPerformer(performer);
      expect(result.instruments).toEqual(['guitar', 'piano']);
    });

    it('generates wikidataUrl from Q-ID', () => {
      const performer = {
        id: 'Q789',
        labels: { en: { value: 'Charlie' } },
        claims: {},
        metadata: {},
        new: false,
      };
      const result = flattenPerformer(performer);
      expect(result.wikidataUrl).toBe('https://www.wikidata.org/wiki/Q789');
    });

    it('converts old PendingWikidataEntity format', () => {
      const performer = {
        id: 'Q111',
        name: 'Dave',
        data: {
          instruments: ['drums'],
          nationality: 'Swedish',
          role: 'drummer',
          bandId: 'Q999',
        },
        type: 'band_member',
        new: false,
      };
      const result = flattenPerformer(performer);
      expect(result.id).toBe('Q111');
      expect(result.name).toBe('Dave');
      expect(result.instruments).toEqual(['drums']);
      expect(result.type).toBe('band_member');
      expect(result.bandQID).toBe('Q999');
    });
  });

  describe('flattenPerformers', () => {
    it('maps array of performers', () => {
      const performers = [
        { id: 'Q1', name: 'A', data: {}, type: 'band_member', new: false },
        { id: 'Q2', name: 'B', data: {}, type: 'additional_artist', new: false },
      ];
      const result = flattenPerformers(performers as any);
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('Q1');
      expect(result[1].id).toBe('Q2');
    });
  });

  describe('getPerformerVariant', () => {
    it('returns "new" for new performers', () => {
      expect(getPerformerVariant({ new: true } as any)).toBe('new');
    });

    it('returns "band" for band_member type', () => {
      expect(getPerformerVariant({ type: 'band_member', new: false } as any)).toBe('band');
    });

    it('returns "additional" for additional_artist type', () => {
      expect(getPerformerVariant({ type: 'additional_artist', new: false } as any)).toBe('additional');
    });

    it('returns "band" when bandQID is present', () => {
      expect(getPerformerVariant({ bandQID: 'Q999', new: false } as any)).toBe('band');
    });

    it('returns "band" when data has bandId', () => {
      expect(getPerformerVariant({ data: { bandId: 'Q888' }, new: false } as any)).toBe('band');
    });

    it('returns "additional" as default fallback', () => {
      expect(getPerformerVariant({ new: false } as any)).toBe('additional');
    });
  });
});
