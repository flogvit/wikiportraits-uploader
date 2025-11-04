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


  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-card-foreground mb-2">Band & Performers</h2>
        <p className="text-muted-foreground">
          Select the main band/artist and all performers who will be featured in your images
        </p>
      </div>

      {/* Main Band/Artist Selection */}
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          Band/Artist *
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