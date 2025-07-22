import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDOrganization } from './WDOrganization';

/**
 * Specialized class for Band/Musical Group entities
 */
export class WDBand extends WDOrganization {
  constructor(entity: WikidataEntity) {
    super(entity, 'Q215380'); // musical group
  }

  // Type check
  isBand(): boolean {
    return this.isInstanceOf(WD_PROPERTIES.BAND) || this.isInstanceOf('Q215380'); // musical group
  }

  // Music-specific methods
  getGenres(): string[] {
    return this.getClaimValues(WD_PROPERTIES.GENRE)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addGenre(genreQid: string): void {
    this.addClaim(WD_PROPERTIES.GENRE, { id: genreQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  getRecordLabels(): string[] {
    return this.getClaimValues(WD_PROPERTIES.RECORD_LABEL)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addRecordLabel(labelQid: string): void {
    this.addClaim(WD_PROPERTIES.RECORD_LABEL, { id: labelQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Get band members (people who are members of this band)
  getMembers(): string[] {
    // This would typically be queried from other entities, but we can store it if needed
    return this.getClaimValues('P527') // has part(s)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addMember(personQid: string): void {
    this.addClaim('P527', { id: personQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }
}