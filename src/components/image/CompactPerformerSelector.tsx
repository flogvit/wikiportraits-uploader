'use client';

import { useState, useEffect, useMemo } from 'react';
import { User } from 'lucide-react';
import { BandMember, MusicEventMetadata } from '@/types/music';
import { ImageFile } from '@/types';
import PerformerCard from '../common/PerformerCard';
import { flattenPerformer, getPerformerVariant } from '@/utils/performer-utils';

interface CompactPerformerSelectorProps {
  image: ImageFile;
  eventDetails?: any;
  bandPerformers?: any;
  musicEventData?: MusicEventMetadata; // Keep for backward compatibility
  onMembersChange: (imageId: string, memberIds: string[]) => void;
}

export default function CompactPerformerSelector({
  image,
  eventDetails,
  bandPerformers,
  musicEventData,
  onMembersChange,
}: CompactPerformerSelectorProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    image.metadata?.selectedBandMembers || []
  );

  useEffect(() => {
    setSelectedMembers(image.metadata?.selectedBandMembers || []);
  }, [image.metadata?.selectedBandMembers]);

  // Get available band members from form data
  const availableMembers: Array<{ member: BandMember, variant: 'band' | 'additional' | 'new' }> = useMemo(() => {
    // Primary source: bandPerformers.performers from the new form structure
    if (bandPerformers?.performers && Array.isArray(bandPerformers.performers)) {
      console.log('CompactPerformerSelector - Using bandPerformers.performers:', bandPerformers.performers);
      // Convert PendingWikidataEntity objects to BandMember objects with variants
      return bandPerformers.performers.map(performer => ({
        member: flattenPerformer(performer),
        variant: getPerformerVariant(performer)
      }));
    }
    
    // Fallback: old musicEventData structure for backward compatibility
    if (musicEventData?.eventType === 'festival' && musicEventData.festivalData?.selectedBands) {
      console.log('CompactPerformerSelector - Using musicEventData fallback');
      return musicEventData.festivalData.selectedBands.flatMap(band => 
        (band.members || []).map(member => ({
          member,
          variant: getPerformerVariant(member) as 'band' | 'additional' | 'new'
        }))
      );
    }
    if (musicEventData?.eventType === 'concert' && musicEventData.concertData?.concert.artist) {
      // For concerts, we might need to fetch members of the main artist if it's a band
      // For now, return empty array - this can be expanded later
      return [];
    }
    return [];
  }, [bandPerformers, musicEventData]);

  const toggleMember = (memberId: string) => {
    const newSelected = selectedMembers.includes(memberId)
      ? selectedMembers.filter(id => id !== memberId)
      : [...selectedMembers, memberId];

    console.log('🎭 toggleMember called:', {
      memberId,
      oldSelected: selectedMembers,
      newSelected,
      imageId: image.id
    });

    setSelectedMembers(newSelected);
    onMembersChange(image.id, newSelected);

    console.log('🎭 onMembersChange called with:', image.id, newSelected);
  };

  // Always show the component for debugging, even if no members available
  console.log('🎵 CompactPerformerSelector - eventDetails:', eventDetails);
  console.log('🎵 CompactPerformerSelector - bandPerformers:', bandPerformers);
  console.log('🎵 CompactPerformerSelector - bandPerformers.performers:', bandPerformers?.performers);
  console.log('🎵 CompactPerformerSelector - musicEventData:', musicEventData);
  console.log('🎵 CompactPerformerSelector - availableMembers:', availableMembers);
  console.log('🎵 CompactPerformerSelector - availableMembers with images:', availableMembers.map(({ member, variant }) => ({
    id: member.id,
    name: member.name,
    imageUrl: member.imageUrl,
    hasImage: !!member.imageUrl,
    variant: variant
  })));

  return (
    <div className="space-y-2">
      <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
        <User className="w-3 h-3" />
        Performers in this image
        {availableMembers.length === 0 && (
          <span className="text-red-500 ml-2">(No members available - check console)</span>
        )}
      </div>
      
      {/* Performer Toggle Grid */}
      {availableMembers.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
          {availableMembers.map(({ member, variant }) => {
            const isSelected = selectedMembers.includes(member.id);
            console.log("Member", member)
            return (
              <PerformerCard
                key={member.id}
                performer={member}
                compact={true}
                selected={isSelected}
                onClick={toggleMember}
                variant={variant}
                showRemove={false}
              />
            );
          })}
        </div>
      )}

      {/* Empty state */}
      {availableMembers.length === 0 && (
        <div className="text-xs text-muted-foreground italic text-center py-4">
          No performers available to tag
        </div>
      )}
    </div>
  );
}