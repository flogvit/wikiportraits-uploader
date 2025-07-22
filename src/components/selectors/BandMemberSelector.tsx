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
    const personIndex = people.findIndex(p => p.id === performerId);
    if (personIndex >= 0) {
      removePerson(personIndex);
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
        {performers.map((performer) => (
          <WDPersonCard
            key={performer.id}
            entity={performer.rawEntity}
            onRemove={handleRemove}
            variant="band-member"
          />
        ))}
      </div>
    </div>
  );
}