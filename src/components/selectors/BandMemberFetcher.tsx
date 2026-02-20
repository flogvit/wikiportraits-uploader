'use client';

import { useEffect } from 'react';
import { useWikidataPersons } from '@/hooks/useWikidataPersons';
import { useUniversalFormEntities } from '@/providers/UniversalFormProvider';
import { WDPerson } from '@/classes';
import { WikidataEntity } from '@/types/wikidata';

interface BandMemberFetcherProps {
  bandName?: string;
  bandId?: string;
}

export default function BandMemberFetcher({
  bandName,
  bandId,
}: BandMemberFetcherProps) {
  const entities = useUniversalFormEntities();
  
  const allPerformers = entities.people || [];
  const currentBandId = bandId || `pending-band-${bandName}`;
  
  // Since we use a key to remount this component when band changes,
  // we can be more aggressive about fetching members for the new band
  // Check if we have ANY performers - if we do, they might be from the old band
  const hasAnyPerformers = allPerformers.length > 0;
  
  // For band changes, we want to fetch if there are no performers OR
  // if the existing performers don't belong to this band
  const hasExistingPerformersForThisBand = allPerformers.some(p => 
    // Check if this person is already associated with this specific band
    // Use P463 (member of) which is what WDPerson.addBandMembership() actually uses
    p.claims?.['P463'] && // member of
    p.claims['P463'].some(claim => claim.mainsnak?.datavalue?.value?.id === bandId)
  );
  
  // Only fetch if we don't have performers for this specific band yet
  const { performers, loading } = useWikidataPersons(
    hasExistingPerformersForThisBand ? undefined : bandName, 
    hasExistingPerformersForThisBand ? undefined : bandId, 
    []
  );
  
  // Add fetched performers to form data
  useEffect(() => {
    if (!hasExistingPerformersForThisBand && performers.length > 0) {
      performers.forEach(performer => {
        const alreadyExists = allPerformers.find(p => p.id === performer.id);
        if (!alreadyExists) {
          // Create base WikidataEntity
          const baseEntity = {
            id: performer.id,
            type: 'item' as const,
            labels: {
              en: {
                language: 'en',
                value: performer.name
              }
            },
            descriptions: {},
            claims: {},
            sitelinks: performer.wikipediaUrl ? {
              enwiki: {
                site: 'enwiki',
                title: performer.wikipediaUrl.split('/').pop() || performer.name
              }
            } : {}
          };

          // Use WDPerson class to add properties cleanly
          const wdPerson = new WDPerson(baseEntity as WikidataEntity);

          // Add band membership if bandId is available
          if (bandId) {
            wdPerson.addBandMembership(bandId);
          }
          
          // Add instruments
          if (performer.instruments && performer.instruments.length > 0) {
            performer.instruments.forEach(instrument => {
              // For now, store instrument names as strings - ideally we'd map to QIDs
              wdPerson.addInstrument(instrument);
            });
          }

          entities.addPerson(wdPerson.rawEntity);
        }
      });
    }
  }, [performers, hasExistingPerformersForThisBand, bandId, currentBandId, entities, allPerformers]);
  
  // Show loading indicator only when first fetching
  if (!hasExistingPerformersForThisBand && loading) {
    return (
      <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-sm text-gray-600">Loading band members...</span>
        </div>
      </div>
    );
  }
  
  return null; // This component doesn't render anything after loading
}