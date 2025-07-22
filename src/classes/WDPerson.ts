import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDEntity } from './WDEntity';

/**
 * Specialized class for Person entities with person-specific methods
 */
export class WDPerson extends WDEntity {
  constructor(entity: WikidataEntity) {
    super(entity);
    // Ensure this is a person entity
    if (!this.isInstanceOf(WD_PROPERTIES.HUMAN)) {
      this.setInstanceOf(WD_PROPERTIES.HUMAN);
    }
  }

  // Birth/Death dates
  getBirthDate(): Date | undefined {
    const birthValue = this.getClaimValue(WD_PROPERTIES.BIRTH_DATE);
    return birthValue ? new Date(birthValue.time) : undefined;
  }

  setBirthDate(date: Date): void {
    this.setClaim(WD_PROPERTIES.BIRTH_DATE, {
      time: date.toISOString(),
      timezone: 0,
      before: 0,
      after: 0,
      precision: 11,
      calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
    }, 'time');
  }

  getDeathDate(): Date | undefined {
    const deathValue = this.getClaimValue(WD_PROPERTIES.DEATH_DATE);
    return deathValue ? new Date(deathValue.time) : undefined;
  }

  // Birth place
  getBirthPlace(): string | undefined {
    const birthPlaceValue = this.getClaimValue(WD_PROPERTIES.BIRTH_PLACE);
    return birthPlaceValue?.id || birthPlaceValue;
  }

  setBirthPlace(placeQid: string): void {
    this.setClaim(WD_PROPERTIES.BIRTH_PLACE, { id: placeQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Citizenship
  getCitizenship(): string[] {
    return this.getClaimValues(WD_PROPERTIES.COUNTRY_OF_CITIZENSHIP)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addCitizenship(countryQid: string): void {
    this.addClaim(WD_PROPERTIES.COUNTRY_OF_CITIZENSHIP, { id: countryQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Occupation
  getOccupations(): string[] {
    return this.getClaimValues(WD_PROPERTIES.OCCUPATION)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addOccupation(occupationQid: string): void {
    this.addClaim(WD_PROPERTIES.OCCUPATION, { id: occupationQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Gender
  getGender(): string | undefined {
    const genderValue = this.getClaimValue(WD_PROPERTIES.GENDER);
    return genderValue?.id || genderValue;
  }

  setGender(genderQid: string): void {
    this.setClaim(WD_PROPERTIES.GENDER, { id: genderQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Music-specific methods
  getInstruments(): string[] {
    return this.getClaimValues(WD_PROPERTIES.INSTRUMENT)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addInstrument(instrumentQid: string): void {
    this.addClaim(WD_PROPERTIES.INSTRUMENT, { id: instrumentQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // For band membership - using "member of" for bands
  getBandMemberships(): string[] {
    return this.getClaimValues(WD_PROPERTIES.MEMBER_OF)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addBandMembership(bandQid: string): void {
    this.addClaim(WD_PROPERTIES.MEMBER_OF, { id: bandQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Soccer-specific methods
  getPosition(): string | undefined {
    const positionValue = this.getClaimValue(WD_PROPERTIES.POSITION_PLAYED);
    return positionValue?.id || positionValue;
  }

  setPosition(positionQid: string): void {
    this.setClaim(WD_PROPERTIES.POSITION_PLAYED, { id: positionQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  getSportsTeams(): string[] {
    return this.getClaimValues(WD_PROPERTIES.MEMBER_OF_SPORTS_TEAM)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addSportsTeam(teamQid: string): void {
    this.addClaim(WD_PROPERTIES.MEMBER_OF_SPORTS_TEAM, { id: teamQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }
}