import { WikidataEntity, WikidataClaim, WikidataSnak, WD_PROPERTIES } from '@/types/wikidata';

/**
 * Base class for all Wikidata entities with common utility methods
 */
export class WDEntity {
  constructor(protected entity: WikidataEntity) {}

  // Basic getters
  get id(): string {
    return this.entity.id;
  }

  get type(): 'item' | 'property' {
    return this.entity.type;
  }

  get rawEntity(): WikidataEntity {
    return this.entity;
  }

  // Label methods
  getLabel(language: string = 'en'): string | undefined {
    return this.entity.labels?.[language]?.value;
  }

  setLabel(value: string, language: string = 'en'): void {
    if (!this.entity.labels) {
      this.entity.labels = {};
    }
    this.entity.labels[language] = { language, value };
  }

  // Description methods
  getDescription(language: string = 'en'): string | undefined {
    return this.entity.descriptions?.[language]?.value;
  }

  setDescription(value: string, language: string = 'en'): void {
    if (!this.entity.descriptions) {
      this.entity.descriptions = {};
    }
    this.entity.descriptions[language] = { language, value };
  }

  // Claim utility methods
  protected getClaim(property: string): WikidataClaim | undefined {
    return this.entity.claims?.[property]?.[0];
  }

  protected getClaims(property: string): WikidataClaim[] {
    return this.entity.claims?.[property] || [];
  }

  protected getClaimValue(property: string): any {
    const claim = this.getClaim(property);
    return claim?.mainsnak?.datavalue?.value;
  }

  protected getClaimValues(property: string): any[] {
    const claims = this.getClaims(property);
    return claims
      .map(claim => claim?.mainsnak?.datavalue?.value)
      .filter(value => value !== undefined);
  }

  protected setClaim(property: string, value: any, datatype: string = 'string'): void {
    if (!this.entity.claims) {
      this.entity.claims = {};
    }

    const claim: WikidataClaim = {
      id: `${this.entity.id}$${property}-${Date.now()}`,
      type: 'statement',
      rank: 'normal',
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value,
          type: datatype
        }
      }
    };

    this.entity.claims[property] = [claim];
  }

  protected addClaim(property: string, value: any, datatype: string = 'string'): void {
    if (!this.entity.claims) {
      this.entity.claims = {};
    }
    if (!this.entity.claims[property]) {
      this.entity.claims[property] = [];
    }

    const claim: WikidataClaim = {
      id: `${this.entity.id}$${property}-${Date.now()}`,
      type: 'statement',
      rank: 'normal',
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value,
          type: datatype
        }
      }
    };

    this.entity.claims[property].push(claim);
  }

  // Instance of methods
  getInstanceOf(): string[] {
    return this.getClaimValues(WD_PROPERTIES.INSTANCE_OF)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  isInstanceOf(qid: string): boolean {
    return this.getInstanceOf().includes(qid);
  }

  setInstanceOf(qid: string): void {
    this.setClaim(WD_PROPERTIES.INSTANCE_OF, { id: qid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Image methods
  getImage(): string | undefined {
    return this.getClaimValue(WD_PROPERTIES.IMAGE);
  }

  setImage(imageUrl: string): void {
    this.setClaim(WD_PROPERTIES.IMAGE, imageUrl);
  }

  // Wikipedia/sitelink methods
  getWikipediaUrl(language: string = 'en'): string | undefined {
    const sitekey = `${language}wiki`;
    const sitelink = this.entity.sitelinks?.[sitekey];
    return sitelink ? `https://${language}.wikipedia.org/wiki/${sitelink.title}` : undefined;
  }

  setWikipediaTitle(title: string, language: string = 'en'): void {
    if (!this.entity.sitelinks) {
      this.entity.sitelinks = {};
    }
    const sitekey = `${language}wiki`;
    this.entity.sitelinks[sitekey] = {
      site: sitekey,
      title
    };
  }

  // Country methods
  getCountry(): string | undefined {
    const countryValue = this.getClaimValue(WD_PROPERTIES.COUNTRY);
    return countryValue?.id || countryValue;
  }

  setCountry(countryQid: string): void {
    this.setClaim(WD_PROPERTIES.COUNTRY, { id: countryQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }
}

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

/**
 * Base class for Organization entities
 */
export class WDOrganization extends WDEntity {
  constructor(entity: WikidataEntity, organizationType?: string) {
    super(entity);
    // Set organization type if provided
    if (organizationType && !this.isInstanceOf(organizationType)) {
      this.setInstanceOf(organizationType);
    }
  }

  // Formation/founding date
  getFormationDate(): Date | undefined {
    const formationValue = this.getClaimValue(WD_PROPERTIES.START_TIME);
    return formationValue ? new Date(formationValue.time) : undefined;
  }

  setFormationDate(date: Date): void {
    this.setClaim(WD_PROPERTIES.START_TIME, {
      time: date.toISOString(),
      timezone: 0,
      before: 0,
      after: 0,
      precision: 11,
      calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
    }, 'time');
  }

  // Location
  getLocation(): string | undefined {
    const locationValue = this.getClaimValue(WD_PROPERTIES.LOCATED_IN);
    return locationValue?.id || locationValue;
  }

  setLocation(locationQid: string): void {
    this.setClaim(WD_PROPERTIES.LOCATED_IN, { id: locationQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }
}

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

/**
 * Specialized class for Soccer Club entities
 */
export class WDSoccerClub extends WDOrganization {
  constructor(entity: WikidataEntity) {
    super(entity, WD_PROPERTIES.FOOTBALL_CLUB);
  }

  // Type check
  isFootballClub(): boolean {
    return this.isInstanceOf(WD_PROPERTIES.FOOTBALL_CLUB);
  }

  // Soccer-specific methods
  getSport(): string | undefined {
    const sportValue = this.getClaimValue(WD_PROPERTIES.SPORT);
    return sportValue?.id || sportValue;
  }

  setSport(sportQid: string = WD_PROPERTIES.ASSOCIATION_FOOTBALL): void {
    this.setClaim(WD_PROPERTIES.SPORT, { id: sportQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // League/competition
  getLeague(): string | undefined {
    const leagueValue = this.getClaimValue('P118'); // league
    return leagueValue?.id || leagueValue;
  }

  setLeague(leagueQid: string): void {
    this.setClaim('P118', { id: leagueQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Stadium/venue
  getStadium(): string | undefined {
    const stadiumValue = this.getClaimValue('P115'); // home venue
    return stadiumValue?.id || stadiumValue;
  }

  setStadium(stadiumQid: string): void {
    this.setClaim('P115', { id: stadiumQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Get players (people who are members of this team)
  getPlayers(): string[] {
    return this.getClaimValues('P527') // has part(s)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  addPlayer(personQid: string): void {
    this.addClaim('P527', { id: personQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }
}

/**
 * Helper to determine entity type and create appropriate wrapper
 * This is the only factory function we need - for auto-detection of entity types
 */
export function createWDEntity(entity: WikidataEntity): WDPerson | WDBand | WDSoccerClub | WDOrganization | WDEntity {
  const instanceOf = entity.claims?.[WD_PROPERTIES.INSTANCE_OF]?.[0]?.mainsnak?.datavalue?.value?.id;
  
  if (instanceOf === WD_PROPERTIES.HUMAN) {
    return new WDPerson(entity);
  } else if ([WD_PROPERTIES.BAND, 'Q215380'].includes(instanceOf)) {
    return new WDBand(entity);
  } else if (instanceOf === WD_PROPERTIES.FOOTBALL_CLUB) {
    return new WDSoccerClub(entity);
  } else if (instanceOf === WD_PROPERTIES.ORGANIZATION) {
    return new WDOrganization(entity);
  }
  
  return new WDEntity(entity);
}