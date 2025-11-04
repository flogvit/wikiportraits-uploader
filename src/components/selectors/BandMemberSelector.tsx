'use client';

import { useEffect } from 'react';
import { WikidataEntity } from '@/types/wikidata';
import WDPersonCard from '@/components/common/WDPersonCard';
import { useUniversalFormEntities } from '@/providers/UniversalFormProvider';
import { WDPerson } from '@/classes';

interface BandMemberSelectorProps {
  bandName?: string;
  bandId?: string;
  showTitle?: boolean;
}

export default function BandMemberSelector({
  bandName,
  bandId,
  showTitle = true,
}: BandMemberSelectorProps) {
  const { people, removePerson } = useUniversalFormEntities();
  
  // Work directly with WikidataEntity objects, wrap in WDPerson for convenience
  const performers = people?.map(person => new WDPerson(person)) || [];
  
  console.log('🎸 BandMemberSelector - performers:', performers.length);
  console.log('🎸 BandMemberSelector - performers data:', performers.map(p => ({
    id: p.id,
    name: p.getLabel(),
    instruments: p.getInstruments()
  })));

  const handleRemove = (performerId: string) => {
    console.log('🗑️ BandMemberSelector - Removing performer:', performerId);
    console.log('🗑️ Current people count:', people.length);
    const personIndex = people.findIndex(p => p.id === performerId);
    console.log('🗑️ Person index to remove:', personIndex);
    if (personIndex >= 0) {
      removePerson(personIndex);
      console.log('🗑️ Called removePerson for index:', personIndex);
    }
  };

  if (performers.length === 0) {
    return (
      <div className="space-y-3">
        {showTitle && <h4 className="text-sm font-medium text-gray-700">Performers:</h4>}
        <p className="text-sm text-gray-500">No performers added yet</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {showTitle && <h4 className="text-sm font-medium text-gray-700">Performers:</h4>}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {performers.map((performer, index) => {
          // Determine variant based on performer type
          const performerId = performer.id;
          
          // Check if it's a new performer (created locally)
          const isNewPerformer = performerId.startsWith('pending-') ||
                                performerId.startsWith('temp-') ||
                                performerId.startsWith('new-') ||
                                (performer.rawEntity as any).new === true;
          
          // Check if it's a main band member (has P463 claim for this band)
          const isMainBandMember = performer.rawEntity.claims?.['P463']?.some(claim => 
            claim.mainsnak?.datavalue?.value?.id === bandId
          );
          
          // Determine variant: new > main band member > additional artist
          let variant: 'main' | 'additional' | 'new';
          if (isNewPerformer) {
            variant = 'new';
          } else if (isMainBandMember) {
            variant = 'main';
          } else {
            variant = 'additional';
          }
          
          console.log('🎨 Performer:', performer.getLabel(), 'ID:', performerId, 'Variant:', variant, 'Band member:', isMainBandMember, 'New:', isNewPerformer);
          
          return (
            <WDPersonCard
              key={performer.id || `performer-${index}`}
              entity={performer.rawEntity}
              onRemove={handleRemove}
              variant={variant}
            />
          );
        })}
      </div>
    </div>
  );
}