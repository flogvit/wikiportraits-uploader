'use client';

import { useEffect } from 'react';
import { useUniversalForm, useUniversalFormEntities, useUniversalFormEventDetails } from '@/providers/UniversalFormProvider';
import ArtistSelector from '@/components/selectors/ArtistSelector';
import BandMemberSelector from '@/components/selectors/BandMemberSelector';
import BandMemberFetcher from '@/components/selectors/BandMemberFetcher';
import AdditionalArtistSelector from '@/components/selectors/AdditionalArtistSelector';
import NewPerformerSelector from '@/components/selectors/NewPerformerSelector';
import WDOrganizationCard from '@/components/common/WDOrganizationCard';
import { WikidataEntity } from '@/types/wikidata';
import { globalEventBus } from '@/utils/event-bus';
import { WDBand } from '@/classes';

interface BandPerformersPaneProps {
  onCompleteAction?: () => void;
}



export default function BandPerformersPane({ 
  onCompleteAction 
}: BandPerformersPaneProps) {
  const form = useUniversalForm();
  const { organizations, people, addOrganization, removeOrganization, removePerson } = useUniversalFormEntities();
  const { setTitle } = useUniversalFormEventDetails();
  
  // Get the main band from organizations - look for organizations with instance of (P31) band/music group
  const selectedBandEntity = organizations.find(org => 
    org.claims?.['P31']?.some(claim => 
      ['Q215380', 'Q5741069'].includes(claim.mainsnak?.datavalue?.value?.id) // musical group, music band
    )
  );

  // Wrap in WDBand for easier access
  const selectedBand = selectedBandEntity ? new WDBand(selectedBandEntity) : null;
  
  const performers = people || [];
  const canComplete = selectedBand?.getLabel() && performers.length > 0;

  // Post semantic data - what we have, not where it should go
  useEffect(() => {
    const postSemanticData = async () => {
      if (selectedBand || performers.length > 0) {
        // Collect all persons and organizations
        const allPersons: WikidataEntity[] = [];
        const allOrganizations: WikidataEntity[] = [];

        // Add main band/organization
        if (selectedBand) {
          allOrganizations.push(selectedBand);
        }

        // Add all performers (they're already WikidataEntity objects)
        performers.forEach((performer: WikidataEntity) => {
          // Determine if this is a person or organization based on entity type
          const entityType = performer.claims?.['P31']?.[0]?.mainsnak?.datavalue?.value?.id;
          if (entityType === 'Q5') {
            // This is a person
            allPersons.push(performer);
          } else {
            // This might be a band/organization
            allOrganizations.push(performer);
          }
        });

        // Post semantic data that any pane can listen to
        if (allPersons.length > 0) {
          await globalEventBus.emit('persons:updated', {
            persons: allPersons,
            source: 'band-performers'
          });
        }

        if (allOrganizations.length > 0) {
          await globalEventBus.emit('organizations:updated', {
            organizations: allOrganizations,
            source: 'band-performers'
          });
        }
      }
    };

    postSemanticData().catch(console.error);
  }, [selectedBand, performers]);


  // Get event participants from event details
  const eventDetails = form.watch('eventDetails');
  const eventParticipants = eventDetails?.participants || [];

  const handleParticipantSelect = async (participant: any) => {
    // Store selected participant info
    form.setValue('workflow.selectedParticipant' as any, participant, { shouldDirty: false });

    // Load images from Commons category
    if (participant.commonsCategory) {
      try {
        const { CommonsClient } = await import('@/lib/api/CommonsClient');
        const { files } = await CommonsClient.getCategoryFiles(participant.commonsCategory, 500);

        // Convert Commons files to the format expected by the form
        const existingImages = files.map((file: any, index: number) => ({
          id: `existing-${file.pageid}`,
          filename: file.title.replace(/^File:/, ''),
          commonsPageId: file.pageid,
          url: file.url,
          thumbUrl: file.thumburl,
          preview: file.thumburl || file.url, // For ImagePreview component
          isExisting: true, // Mark as existing (not new upload)
          file: undefined, // No File object for existing images
          metadata: {
            description: file.extmetadata?.ImageDescription?.value || '',
            categories: file.extmetadata?.Categories?.value?.split('|') || [],
            date: file.extmetadata?.DateTime?.value || file.timestamp,
            author: file.extmetadata?.Artist?.value || file.user,
            source: 'Wikimedia Commons',
            license: file.extmetadata?.LicenseShortName?.value || '',
          }
        }));

        // Store existing images in the form
        form.setValue('files.existing' as any, existingImages, { shouldDirty: false });

        console.log(`Loaded ${existingImages.length} existing images for ${participant.name}`);
      } catch (error) {
        console.error('Error loading participant images:', error);
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Band & Performers</h2>
        <p className="text-muted-foreground">
          Select the main band/artist and all performers who will be featured in your images
        </p>
      </div>

      {/* Event Participants Selection (if available) */}
      {eventParticipants.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
            Event Participants ({eventParticipants.length})
          </h3>
          <p className="text-sm text-blue-700 mb-3">
            Select a participant to work with their existing images, or add a new band below
          </p>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {eventParticipants.map((participant: any) => (
              <button
                key={participant.id}
                onClick={() => handleParticipantSelect(participant)}
                className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 hover:border-blue-400 transition-colors"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="font-medium text-gray-900">{participant.name}</div>
                    {participant.commonsCategory && (
                      <div className="text-xs text-gray-500 mt-1">
                        {participant.commonsCategory}
                      </div>
                    )}
                  </div>
                  <div className="text-sm text-blue-600">Select →</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Band/Artist Selection */}
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          {eventParticipants.length > 0 ? 'Or Add New Band/Artist' : 'Band/Artist *'}
        </label>
        <p className="text-sm text-muted-foreground mb-3">
          Select the primary band or artist for this upload session
        </p>
        <ArtistSelector
          returnType="WikidataEntity"
          onArtistSelect={() => {}} // Not used when returnType is WikidataEntity
          onWikidataEntitySelect={(entity) => {
            // Remove existing main band if any
            const existingBandIndex = organizations.findIndex(org => 
              org.claims?.['P31']?.some(claim => 
                ['Q215380', 'Q5741069'].includes(claim.mainsnak?.datavalue?.value?.id)
              )
            );
            if (existingBandIndex >= 0) {
              removeOrganization(existingBandIndex);
            }
            
            // Clear all performers when selecting a new band
            // This ensures a clean slate for the new band's performers
            console.log('🔄 Band changed - clearing performers. Old count:', people.length);
            
            // Clear localStorage first to prevent restoration
            form.clearStorage();
            
            // Then clear all people
            form.setValue('entities.people', [], { shouldDirty: true });
            
            console.log('🗑️ Cleared performers and localStorage for new band:', entity.labels?.en?.value);
            
            // Wrap in WDBand and ensure it's marked as a band
            const wdBand = new WDBand(entity);

            // Add new main band to organizations
            addOrganization(wdBand.rawEntity);

            // Only set event title if it's empty (first time setup)
            // Don't overwrite existing event details when switching bands
            const currentTitle = form.getValues('eventDetails.title');
            if (!currentTitle || currentTitle.trim() === '') {
              setTitle(wdBand.getLabel() || '');
            }
          }}
          selectedArtist={selectedBand ? {
            id: selectedBand.id,
            name: selectedBand.getLabel() || ''
          } : { id: 'empty', name: '' }}
          placeholder="Search for band/artist..."
          label=""
          type="band"
        />
        {selectedBand && (
          <div className="mt-3">
            <WDOrganizationCard
              entity={selectedBand.rawEntity}
              variant="main"
              onRemove={() => {
                // Remove the main band from organizations
                const bandIndex = organizations.findIndex(org =>
                  org.claims?.['P31']?.some(claim =>
                    ['Q215380', 'Q5741069'].includes(claim.mainsnak?.datavalue?.value?.id)
                  )
                );
                if (bandIndex >= 0) {
                  removeOrganization(bandIndex);
                }

                // Don't clear event title - event details should persist across bands
                // This allows working on the same event with multiple bands over time
              }}
            />
          </div>
        )}
      </div>

      {/* Artists & Performers Section */}
      {selectedBand && (
        <div>
          {/* Fetch band members when band is first selected */}
          {/* Use key to force complete remount when band changes */}
          <BandMemberFetcher
            key={`band-${selectedBand.id}`}
            bandName={selectedBand.getLabel()}
            bandId={selectedBand.id}
          />
          
          <div className="space-y-6">
            {/* All Performers */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Performers
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                All band members and additional artists performing at this event
              </p>
              
              {/* Combined performer display */}
              <BandMemberSelector
                bandName={selectedBand.getLabel()}
                bandId={selectedBand.id}
                showTitle={false}
              />
            </div>

            {/* Additional Artists Search */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Additional artists
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                Search and add artists who are not band members but performed at this event
              </p>
              <AdditionalArtistSelector
                bandName={selectedBand.getLabel()}
                bandId={selectedBand.id}
                placeholder="Search for additional artists and performers..."
                showTitle={false}
              />
            </div>

            {/* New Performers */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Add new artist
              </label>
              <p className="text-sm text-muted-foreground mb-3">
                Create entries for artists not yet on Wikidata
              </p>
              <NewPerformerSelector
                bandName={selectedBand.getLabel()}
                bandId={selectedBand.id}
                showTitle={false}
              />
            </div>
          </div>
        </div>
      )}

      {canComplete && (
        <div className="text-center">
          <button
            onClick={() => onCompleteAction?.()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Band & Performers Complete - Continue to Categories
          </button>
        </div>
      )}
    </div>
  );
}