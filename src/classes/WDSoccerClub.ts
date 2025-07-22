import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDOrganization } from './WDOrganization';

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