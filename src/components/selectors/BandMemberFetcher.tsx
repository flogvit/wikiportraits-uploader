'use client';

import { useEffect } from 'react';
import { useWikidataPersons } from '@/hooks/useWikidataPersons';
import { useUniversalFormEntities } from '@/providers/UniversalFormProvider';

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
  const hasExistingPerformers = allPerformers.some(p => p.data?.bandId === currentBandId && !p.new);
  
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
          const performerEntity = {
            id: performer.id,
            type: 'band_member' as const,
            status: 'created' as const,
            name: performer.name,
            new: false,
            bandQID: bandId,
            data: {
              name: performer.name,
              instruments: performer.instruments || [],
              nationality: performer.nationality,
              wikidataUrl: performer.wikidataUrl,
              wikipediaUrl: performer.wikipediaUrl,
              imageUrl: performer.imageUrl,
              birthDate: performer.birthDate,
              bandId: bandId || currentBandId
            }
          };
          entities.addPerson(performerEntity);
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