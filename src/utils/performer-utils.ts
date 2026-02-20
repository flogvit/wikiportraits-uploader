import { PendingWikidataEntity, PendingBandMemberData } from '@/types/music';
import { BandMember } from '@/types/music';

/**
 * Converts a PendingWikidataEntity to a BandMember object for use with PerformerCard
 */
export function flattenPerformer(performer: any): BandMember {
  // Handle WikidataEntity format (from entities.people)
  if (performer.labels) {
    // Extract instruments from P1303 claims
    const instrumentClaims = performer.claims?.P1303 || [];
    const instruments = instrumentClaims.map((claim: any) => {
      const instrumentId = claim.mainsnak?.datavalue?.value?.id;
      // Return the ID for now (it's the instrument name like "guitar", "singing", etc.)
      return instrumentId || '';
    }).filter(Boolean);

    return {
      id: performer.id,
      name: performer.labels?.en?.value || performer.labels?.['en']?.value || 'Unknown',
      instruments: instruments.length > 0 ? instruments : (performer.metadata?.instruments || []),
      nationality: performer.metadata?.nationality,
      role: performer.metadata?.role,
      wikidataUrl: performer.metadata?.wikidataUrl || (performer.id?.startsWith('Q') ? `https://www.wikidata.org/wiki/${performer.id}` : undefined),
      wikipediaUrl: performer.metadata?.wikipediaUrl,
      imageUrl: performer.metadata?.imageUrl,
      birthDate: performer.metadata?.birthDate,
      type: performer.metadata?.isBandMember ? 'band_member' : 'additional_artist',
      new: performer.new,
      bandQID: performer.metadata?.bandId,
    };
  }

  // Handle old PendingWikidataEntity format
  const memberData = performer.data as PendingBandMemberData;
  return {
    id: performer.id,
    name: performer.name,
    instruments: memberData?.instruments || [],
    nationality: memberData?.nationality,
    role: memberData?.role,
    wikidataUrl: memberData?.wikidataUrl,
    wikipediaUrl: memberData?.wikipediaUrl,
    imageUrl: memberData?.imageUrl,
    birthDate: memberData?.birthDate,
    type: performer.type as 'band_member' | 'additional_artist' | undefined,
    new: performer.new,
    bandQID: memberData?.bandId,
  };
}

/**
 * Converts an array of PendingWikidataEntity objects to BandMember objects
 */
export function flattenPerformers(performers: PendingWikidataEntity[]): BandMember[] {
  return performers.map(flattenPerformer);
}

/**
 * Determines the variant for a performer based on their type and status
 */
export function getPerformerVariant(performer: PendingWikidataEntity | BandMember): 'band' | 'additional' | 'new' {
  // Handle new performers first
  if (performer.new) {
    return 'new';
  }
  
  // Handle typed performers
  if (performer.type === 'band_member') {
    return 'band';
  }
  
  if (performer.type === 'additional_artist') {
    return 'additional';
  }
  
  // Fallback logic for performers without explicit type
  // If performer has bandQID, they're a band member; otherwise they're additional
  if ('bandQID' in performer && performer.bandQID) {
    return 'band';
  }
  
  if ('data' in performer && (performer.data as PendingBandMemberData)?.bandId) {
    return 'band';
  }
  
  return 'additional';
}