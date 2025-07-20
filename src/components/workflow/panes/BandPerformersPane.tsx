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

interface BandPerformersPaneProps {
  onCompleteAction?: () => void;
}

// Utility function to convert band data to WikidataEntity format
function convertBandToWikidataEntity(band: {
  id?: string;
  name?: string;
  wikipediaUrl?: string;
  wikidataUrl?: string;
  musicbrainzId?: string;
  country?: string;
  entityType?: string;
  source?: string;
}): WikidataEntity {
  return {
    id: band.id || `band-${Date.now()}`,
    type: 'item',
    labels: {
      en: { 
        language: 'en', 
        value: band.name || 'Unknown Band'
      }
    },
    descriptions: {},
    claims: {},
    sitelinks: band.wikipediaUrl ? {
      enwiki: {
        site: 'enwiki',
        title: band.wikipediaUrl.split('/').pop() || band.name || 'Unknown'
      }
    } : {}
  };
}


export default function BandPerformersPane({ 
  onCompleteAction 
}: BandPerformersPaneProps) {
  const form = useUniversalForm();
  const { organizations, people, addOrganization, removeOrganization } = useUniversalFormEntities();
  const { setTitle } = useUniversalFormEventDetails();
  
  // Get the main band from organizations with 'main-band' role
  const selectedBand = organizations.find(org => org.roles.includes('main-band'));
  
  // Convert to old format for compatibility
  const bandPerformers = {
    selectedBand: selectedBand ? {
      id: selectedBand.entity.id,
      name: selectedBand.entity.labels?.en?.value || 'Unknown Band',
      wikipediaUrl: selectedBand.metadata?.wikipediaUrl,
      wikidataUrl: selectedBand.metadata?.wikidataUrl,
      musicbrainzId: selectedBand.metadata?.musicbrainzId,
      country: selectedBand.metadata?.country,
      entityType: selectedBand.metadata?.entityType,
      source: selectedBand.source
    } : undefined,
    performers: people
  };
  
  const performers = people || [];
  const canComplete = bandPerformers?.selectedBand?.name && performers.length > 0;

  // Post semantic data - what we have, not where it should go
  useEffect(() => {
    const postSemanticData = async () => {
      if (bandPerformers?.selectedBand || performers.length > 0) {
        // Collect all persons (performers, band members, etc.)
        const allPersons: WikidataEntity[] = [];
        const allOrganizations: WikidataEntity[] = [];

        // Add main band/organization
        if (bandPerformers?.selectedBand) {
          const bandEntity = convertBandToWikidataEntity(bandPerformers.selectedBand);
          allOrganizations.push(bandEntity);
        }

        // Add all performers who are persons
        performers.forEach((performer: any) => {
          const entity = performer.entity || performer;
          if (entity) {
            // Determine if this is a person or organization based on entity type
            const entityType = entity.claims?.['P31']?.[0]?.mainsnak?.datavalue?.value?.id;
            if (entityType === 'Q5' || performer.type === 'person') {
              // This is a person
              allPersons.push(entity);
            } else {
              // This might be a band/organization
              allOrganizations.push(entity);
            }
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
  }, [bandPerformers?.selectedBand, performers]);


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
          onArtistSelect={(artist) => {
            const newBand = {
              id: artist.id || `band-${Date.now()}`,
              name: artist.name || '',
              wikipediaUrl: artist.wikipediaUrl,
              wikidataUrl: artist.wikidataUrl,
              musicbrainzId: artist.musicbrainzId,
              country: artist.country,
              entityType: artist.entityType,
              source: artist.source
            };
            
            // Remove existing main band if any
            const existingBandIndex = organizations.findIndex(org => org.roles.includes('main-band'));
            if (existingBandIndex >= 0) {
              removeOrganization(existingBandIndex);
            }
            
            // Add new main band to organizations
            addOrganization({
              entity: {
                id: artist.id || `band-${Date.now()}`,
                type: 'item',
                labels: {
                  en: {
                    language: 'en',
                    value: artist.name || ''
                  }
                },
                descriptions: {},
                claims: {},
                sitelinks: artist.wikipediaUrl ? {
                  enwiki: {
                    site: 'enwiki',
                    title: artist.wikipediaUrl.split('/').pop() || artist.name
                  }
                } : {}
              },
              roles: ['main-band', 'featured-organization'],
              isNew: false,
              source: 'band-performers',
              metadata: {
                wikipediaUrl: artist.wikipediaUrl,
                wikidataUrl: artist.wikidataUrl,
                musicbrainzId: artist.musicbrainzId,
                country: artist.country,
                entityType: artist.entityType
              }
            });
            
            // Update the event title with the band name
            setTitle(artist.name || '');
          }}
          selectedArtist={bandPerformers?.selectedBand ? {
            id: bandPerformers.selectedBand.id,
            name: bandPerformers.selectedBand.name
          } : { id: 'empty', name: '' }}
          placeholder="Search for band/artist..."
          label=""
          type="band"
        />
        {bandPerformers?.selectedBand?.name && (
          <div className="mt-3">
            <WDOrganizationCard
              entity={convertBandToWikidataEntity(bandPerformers.selectedBand)}
              variant="main"
              onRemove={() => {
                // Remove the main band from organizations
                const bandIndex = organizations.findIndex(org => org.roles.includes('main-band'));
                if (bandIndex >= 0) {
                  removeOrganization(bandIndex);
                }
                
                // Clear event title
                setTitle('');
              }}
            />
          </div>
        )}
      </div>

      {/* Artists & Performers Section */}
      {bandPerformers?.selectedBand?.name && (
        <div>
          {/* Fetch band members when band is first selected */}
          <BandMemberFetcher
            bandName={bandPerformers.selectedBand?.name}
            bandId={bandPerformers.selectedBand?.id}
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
                bandName={bandPerformers.selectedBand?.name}
                bandId={bandPerformers.selectedBand?.id}
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
                bandName={bandPerformers.selectedBand?.name}
                bandId={bandPerformers.selectedBand?.id}
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
                bandName={bandPerformers.selectedBand?.name}
                bandId={bandPerformers.selectedBand?.id}
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