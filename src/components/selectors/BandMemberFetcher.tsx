'use client';

import { useEffect } from 'react';
import { useWikidataPersons } from '@/hooks/useWikidataPersons';
import { useUniversalFormEntities } from '@/providers/UniversalFormProvider';
import { WDPerson } from '@/lib/wikidata-entities';

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
  const hasExistingPerformers = allPerformers.some(p => 
    // Check if this person is already associated with this band
    p.claims?.['P361'] && // member of
    p.claims['P361'].some(claim => claim.mainsnak?.datavalue?.value?.id === bandId)
  );
  
  console.log('🎸 BandMemberFetcher - hasExistingPerformers:', hasExistingPerformers, 'for bandId:', currentBandId);
  console.log('🎸 BandMemberFetcher - allPerformers:', allPerformers.length);
  
  // Only fetch if we don't have performers yet
  const { performers, loading } = useWikidataPersons(
    hasExistingPerformers ? undefined : bandName, 
    hasExistingPerformers ? undefined : bandId, 
    []
  );
  
  // Add fetched performers to form data
  useEffect(() => {
    if (!hasExistingPerformers && performers.length > 0) {
      console.log('🎸 BandMemberFetcher - Adding performers from Wikidata:', performers.length);
      performers.forEach(performer => {
        if (!allPerformers.find(p => p.id === performer.id)) {
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
  }, [performers, hasExistingPerformers, bandId, currentBandId, entities, allPerformers]);
  
  // Show loading indicator only when first fetching
  if (!hasExistingPerformers && loading) {
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