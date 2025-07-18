'use client';

import { useEffect } from 'react';
import { BandMember } from '@/types/music';
import PerformerCard from '@/components/common/PerformerCard';
import { useWorkflowForm } from '@/components/workflow/providers/WorkflowFormProvider';
import { useWikidataPersons } from '@/hooks/useWikidataPersons';
import { flattenPerformer, getPerformerVariant } from '@/utils/performer-utils';

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
  const { removePerformer, getAllPerformers } = useWorkflowForm();
  
  const allPerformers = getAllPerformers();
  // Use actual Wikidata ID if available, otherwise fall back to pending format
  const currentBandId = bandId || `pending-band-${bandName}`;
  
  // Show ALL performers (band members, additional artists, and new performers)
  const allDisplayPerformers = allPerformers; // Show everything
  
  console.log('🎸 BandMemberSelector - currentBandId:', currentBandId);
  console.log('🎸 BandMemberSelector - allPerformers:', allPerformers.length);
  console.log('🎸 BandMemberSelector - allDisplayPerformers:', allDisplayPerformers.length);
  console.log('🎸 BandMemberSelector - filtered performers:', allDisplayPerformers.map(p => ({
    name: p.name,
    type: p.type,
    bandId: p.data?.bandId,
    bandQID: p.bandQID
  })));

  const handleRemove = (performerId: string) => {
    removePerformer(performerId);
  };

  if (allDisplayPerformers.length === 0) {
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
        {allDisplayPerformers.map((performer) => {
          // Determine variant based on type and status
          const variant = getPerformerVariant(performer);
          
          // Create flattened performer object for PerformerCard
          const flatPerformer = flattenPerformer(performer);
          
          return (
            <PerformerCard
              key={performer.id}
              performer={flatPerformer}
              onRemove={handleRemove}
              variant={variant}
            />
          );
        })}
      </div>
    </div>
  );
}