'use client';

import { useEffect } from 'react';
import { useWikidataPersons } from '@/hooks/useWikidataPersons';
import { useUniversalFormEntities } from '@/providers/UniversalFormProvider';
import { WDPerson } from '@/classes';

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
  
  console.log('🎸 BandMemberFetcher mounted for band:', bandName, 'ID:', bandId);
  
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
  
  console.log('🔍 hasAnyPerformers:', hasAnyPerformers);
  console.log('🔍 hasExistingPerformersForThisBand:', hasExistingPerformersForThisBand);
  
  console.log('🎸 BandMemberFetcher - Band:', bandName, 'ID:', bandId);
  console.log('🎸 BandMemberFetcher - Total performers:', allPerformers.length);
  console.log('🎸 BandMemberFetcher - Performers for this band:', hasExistingPerformersForThisBand);
  console.log('🎸 BandMemberFetcher - All performer IDs:', allPerformers.map(p => p.id));
  
  // Only fetch if we don't have performers for this specific band yet
  const { performers, loading } = useWikidataPersons(
    hasExistingPerformersForThisBand ? undefined : bandName, 
    hasExistingPerformersForThisBand ? undefined : bandId, 
    []
  );
  
  // Add fetched performers to form data
  useEffect(() => {
    console.log('🎸 BandMemberFetcher useEffect triggered');
    console.log('🎸 hasExistingPerformersForThisBand:', hasExistingPerformersForThisBand);
    console.log('🎸 performers.length:', performers.length);
    if (!hasExistingPerformersForThisBand && performers.length > 0) {
      console.log('🎸 BandMemberFetcher - Adding performers from Wikidata:', performers.length);
      performers.forEach(performer => {
        const alreadyExists = allPerformers.find(p => p.id === performer.id);
        console.log('🎸 Checking performer:', performer.name, 'Already exists:', !!alreadyExists);
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
          const wdPerson = new WDPerson(baseEntity);
          
          // Add band membership if bandId is available
          if (bandId) {
            console.log('🎯 Adding band membership:', bandId, 'to performer:', performer.name);
            wdPerson.addBandMembership(bandId);
            console.log('🎯 After adding membership, P361 claims:', wdPerson.rawEntity.claims?.['P361']);
          }
          
          // Add instruments
          if (performer.instruments && performer.instruments.length > 0) {
            performer.instruments.forEach(instrument => {
              // For now, store instrument names as strings - ideally we'd map to QIDs
              wdPerson.addInstrument(instrument);
            });
          }

          console.log('🎸 Adding performer to entities:', performer.name);
          entities.addPerson(wdPerson.rawEntity);
        }
      });
    } else {
      console.log('🎸 Not adding performers - either hasExisting or no performers');
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