import {
  extractCommonsCategory,
  getOccupationForDisambiguation,
  getNationalityForDisambiguation,
  isPerformer,
} from '../performer-categories';

// Test the pure functions that don't require network/API calls

describe('performer-categories', () => {
  describe('extractCommonsCategory', () => {
    it('returns P373 value when present', () => {
      const entity = {
        id: 'Q123',
        claims: {
          P373: [{ mainsnak: { datavalue: { value: 'John Doe' } } }],
        },
      } as any;
      expect(extractCommonsCategory(entity)).toBe('John Doe');
    });

    it('returns null when P373 is absent', () => {
      const entity = { id: 'Q123', claims: {} } as any;
      expect(extractCommonsCategory(entity)).toBeNull();
    });

    it('returns null when P373 array is empty', () => {
      const entity = { id: 'Q123', claims: { P373: [] } } as any;
      expect(extractCommonsCategory(entity)).toBeNull();
    });

    it('returns null when value is not a string', () => {
      const entity = {
        id: 'Q123',
        claims: {
          P373: [{ mainsnak: { datavalue: { value: 42 } } }],
        },
      } as any;
      expect(extractCommonsCategory(entity)).toBeNull();
    });
  });

  describe('getOccupationForDisambiguation', () => {
    it('returns "singer" for Q177220', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P106: [{ mainsnak: { datavalue: { value: { id: 'Q177220' } } } }],
        },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('singer');
    });

    it('returns "guitarist" for Q855091', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P106: [{ mainsnak: { datavalue: { value: { id: 'Q855091' } } } }],
        },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('guitarist');
    });

    it('returns null when no occupation claims', () => {
      const entity = { id: 'Q1', claims: {} } as any;
      expect(getOccupationForDisambiguation(entity)).toBeNull();
    });

    it('falls back to "musician" for unknown occupations', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P106: [{ mainsnak: { datavalue: { value: { id: 'Q99999' } } } }],
        },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('musician');
    });
  });

  describe('getNationalityForDisambiguation', () => {
    it('returns "Norwegian" for Q20', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P27: [{ mainsnak: { datavalue: { value: { id: 'Q20' } } } }],
        },
      } as any;
      expect(getNationalityForDisambiguation(entity)).toBe('Norwegian');
    });

    it('returns "American" for Q30', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P27: [{ mainsnak: { datavalue: { value: { id: 'Q30' } } } }],
        },
      } as any;
      expect(getNationalityForDisambiguation(entity)).toBe('American');
    });

    it('returns null for no nationality claims', () => {
      const entity = { id: 'Q1', claims: {} } as any;
      expect(getNationalityForDisambiguation(entity)).toBeNull();
    });

    it('returns null for unmapped nationality', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P27: [{ mainsnak: { datavalue: { value: { id: 'Q99999' } } } }],
        },
      } as any;
      expect(getNationalityForDisambiguation(entity)).toBeNull();
    });
  });

  describe('getOccupationForDisambiguation - more occupations', () => {
    it('returns "bassist" for Q765778', () => {
      const entity = {
        id: 'Q1',
        claims: { P106: [{ mainsnak: { datavalue: { value: { id: 'Q765778' } } } }] },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('bassist');
    });

    it('returns "drummer" for Q386854', () => {
      const entity = {
        id: 'Q1',
        claims: { P106: [{ mainsnak: { datavalue: { value: { id: 'Q386854' } } } }] },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('drummer');
    });

    it('returns "keyboardist" for Q2252262', () => {
      const entity = {
        id: 'Q1',
        claims: { P106: [{ mainsnak: { datavalue: { value: { id: 'Q2252262' } } } }] },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('keyboardist');
    });

    it('returns "composer" for Q36834', () => {
      const entity = {
        id: 'Q1',
        claims: { P106: [{ mainsnak: { datavalue: { value: { id: 'Q36834' } } } }] },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('composer');
    });

    it('returns null for empty P106 array', () => {
      const entity = { id: 'Q1', claims: { P106: [] } } as any;
      expect(getOccupationForDisambiguation(entity)).toBeNull();
    });

    it('finds musical occupation among multiple occupations', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P106: [
            { mainsnak: { datavalue: { value: { id: 'Q99999' } } } }, // unknown
            { mainsnak: { datavalue: { value: { id: 'Q177220' } } } }, // singer
          ],
        },
      } as any;
      expect(getOccupationForDisambiguation(entity)).toBe('singer');
    });
  });

  describe('getNationalityForDisambiguation - more countries', () => {
    it('returns "British" for Q145', () => {
      const entity = {
        id: 'Q1',
        claims: { P27: [{ mainsnak: { datavalue: { value: { id: 'Q145' } } } }] },
      } as any;
      expect(getNationalityForDisambiguation(entity)).toBe('British');
    });

    it('returns "Swedish" for Q34', () => {
      const entity = {
        id: 'Q1',
        claims: { P27: [{ mainsnak: { datavalue: { value: { id: 'Q34' } } } }] },
      } as any;
      expect(getNationalityForDisambiguation(entity)).toBe('Swedish');
    });

    it('returns "German" for Q183', () => {
      const entity = {
        id: 'Q1',
        claims: { P27: [{ mainsnak: { datavalue: { value: { id: 'Q183' } } } }] },
      } as any;
      expect(getNationalityForDisambiguation(entity)).toBe('German');
    });

    it('returns null when P27 is empty array', () => {
      const entity = { id: 'Q1', claims: { P27: [] } } as any;
      expect(getNationalityForDisambiguation(entity)).toBeNull();
    });

    it('returns null when no nationality ID present', () => {
      const entity = {
        id: 'Q1',
        claims: { P27: [{ mainsnak: { datavalue: { value: {} } } }] },
      } as any;
      expect(getNationalityForDisambiguation(entity)).toBeNull();
    });
  });

  describe('isPerformer', () => {
    it('returns true when entity is instance of Q5 (human)', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P31: [{ mainsnak: { datavalue: { value: { id: 'Q5' } } } }],
        },
      } as any;
      expect(isPerformer(entity)).toBe(true);
    });

    it('returns false when no instance-of claims', () => {
      const entity = { id: 'Q1', claims: {} } as any;
      expect(isPerformer(entity)).toBe(false);
    });

    it('returns false when entity is not human', () => {
      const entity = {
        id: 'Q1',
        claims: {
          P31: [{ mainsnak: { datavalue: { value: { id: 'Q11424' } } } }],
        },
      } as any;
      expect(isPerformer(entity)).toBe(false);
    });
  });
});
