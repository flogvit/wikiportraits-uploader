import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDEntity } from './WDEntity';

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