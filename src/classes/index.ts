// Export all Wikidata entity classes
export { WDEntity } from './WDEntity';
export { WDPerson } from './WDPerson';
export { WDOrganization } from './WDOrganization';
export { WDBand } from './WDBand';
export { WDSoccerClub } from './WDSoccerClub';

// Helper function for auto-detection of entity types
import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import { WDEntity } from './WDEntity';
import { WDPerson } from './WDPerson';
import { WDOrganization } from './WDOrganization';
import { WDBand } from './WDBand';
import { WDSoccerClub } from './WDSoccerClub';

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