'use client';

import { useFormContext } from 'react-hook-form';
import { WorkflowFormData } from '../providers/WorkflowFormProvider';
import ArtistSelector from '@/components/selectors/ArtistSelector';
import BandMemberSelector from '@/components/selectors/BandMemberSelector';
import BandMemberFetcher from '@/components/selectors/BandMemberFetcher';
import AdditionalArtistSelector from '@/components/selectors/AdditionalArtistSelector';
import NewPerformerSelector from '@/components/selectors/NewPerformerSelector';
import { Users, Globe, MapPin, X } from 'lucide-react';

interface BandPerformersPaneProps {
  onComplete?: () => void;
}

interface BandCardProps {
  band: {
    id: string;
    name: string;
    wikipediaUrl?: string;
    wikidataUrl?: string;
    musicbrainzId?: string;
    country?: string;
    entityType?: string;
    source?: string;
  };
  onRemove?: () => void;
}

function BandCard({ band, onRemove }: BandCardProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white shadow-sm">
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <Users className="w-5 h-5 text-blue-600" />
            <h3 className="font-semibold text-gray-900">{band.name}</h3>
            <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
              {band.entityType === 'group' ? 'Band' : 'Artist'}
            </span>
          </div>
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {band.country && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{band.country}</span>
              </div>
            )}
            
            {band.wikidataUrl && (
              <a
                href={band.wikidataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
              >
                <Globe className="w-3 h-3" />
                <span>Wikidata</span>
              </a>
            )}
            
            {band.wikipediaUrl && (
              <a
                href={band.wikipediaUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors"
              >
                <Globe className="w-3 h-3" />
                <span>Wikipedia</span>
              </a>
            )}
          </div>
        </div>
        
        {onRemove && (
          <button
            onClick={onRemove}
            className="ml-3 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Remove band"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

export default function BandPerformersPane({ 
  onComplete 
}: BandPerformersPaneProps) {
  const { watch, setValue } = useFormContext<WorkflowFormData>();

  const bandPerformers = watch('bandPerformers');
  
  const performers = bandPerformers?.performers || [];
  const canComplete = bandPerformers?.selectedBand?.name && performers.length > 0;


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
            
            setValue('bandPerformers.selectedBand', newBand);
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
            <BandCard 
              band={bandPerformers.selectedBand} 
              onRemove={() => {
                // Clear form data - form provider will handle localStorage cleanup
                setValue('bandPerformers.selectedBand', undefined);
                setValue('bandPerformers.performers', []);
                setValue('pendingWikidataEntities', []);
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
            onClick={() => onComplete?.()}
            className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
          >
            Band & Performers Complete - Continue to Categories
          </button>
        </div>
      )}
    </div>
  );
}