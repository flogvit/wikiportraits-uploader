'use client';

import { ImagePlus } from 'lucide-react';
import { useFormContext } from 'react-hook-form';
import { ImageFile } from '@/app/page';
import { MusicEventMetadata } from '@/types/music';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/forms/SoccerMatchForm';
import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { WorkflowFormData, useWorkflowForm } from '../providers/WorkflowFormProvider';
import { useWorkflowUI } from '../providers/WorkflowUIProvider';
import ImageUploader from '@/components/upload/ImageUploader';
import ImageGrid from '@/components/image/ImageGrid';

interface ImagesPaneProps {
  onComplete?: () => void;
}

export default function ImagesPane({
  onComplete
}: ImagesPaneProps) {
  const { onExportMetadata, onBulkEdit, onScrollToImage, onImageClick } = useWorkflowUI();
  const { images, addImages, updateImage, removeImage, form } = useWorkflowForm();
  const { watch } = useFormContext<WorkflowFormData>();
  
  // Get data from the unified form  
  const uploadType = form.watch('uploadType');
  const soccerMatchData = form.watch('soccerMatchData');
  const selectedPlayers = form.watch('selectedPlayers') || [];
  const musicEventData = form.watch('musicEventData');
  const eventDetails = watch('eventDetails');
  const completedCount = (images || []).filter(image => {
    const { description, author, selectedBand } = image.metadata;
    const hasBasicInfo = description.trim() && author.trim();
    
    // For music events, also require a selected band
    if (musicEventData?.eventType === 'festival') {
      return hasBasicInfo && selectedBand?.trim();
    }
    
    return hasBasicInfo;
  }).length;

  const allImagesComplete = (images?.length || 0) > 0 && completedCount === (images?.length || 0);

  // Check if essential event details are missing
  const getMissingEventDetails = () => {
    const missing: string[] = [];
    
    if (uploadType === 'music' && musicEventData?.eventType === 'festival') {
      if (!musicEventData.festivalData?.authorUsername && !musicEventData.festivalData?.authorFullName) {
        missing.push('Author information (username or full name)');
      }
      if (!musicEventData.festivalData?.selectedBands?.length) {
        missing.push('Selected band/artist');
      }
      if (!musicEventData.festivalData?.festival?.name) {
        missing.push('Festival name');
      }
    } else if (uploadType === 'soccer') {
      if (!soccerMatchData?.homeTeam?.name || !soccerMatchData?.awayTeam?.name) {
        missing.push('Team information');
      }
      if (!selectedPlayers?.length) {
        missing.push('Selected players');
      }
    }
    
    return missing;
  };

  const missingDetails = getMissingEventDetails();
  const hasEventDetailsWarning = missingDetails.length > 0;

  const handleCompleteStep = () => {
    onComplete?.();
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <ImagePlus className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-card-foreground mb-2">Images</h2>
        <p className="text-muted-foreground mb-6">
          Add and manage your images for the event
        </p>
      </div>

      {/* Warning for missing event details */}
      {hasEventDetailsWarning && (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <p className="text-warning font-medium">⚠️ Missing Event Details</p>
          <p className="text-muted-foreground text-sm mt-1">
            Complete the following event details first to ensure all images have proper metadata:
          </p>
          <ul className="text-muted-foreground text-sm mt-2 space-y-1">
            {missingDetails.map((detail, index) => (
              <li key={index}>• {detail}</li>
            ))}
          </ul>
          <p className="text-warning text-xs mt-3">
            💡 These details will be automatically applied to all images and are required for proper Commons categorization.
          </p>
        </div>
      )}
      
      <ImageUploader
        onImagesAdded={addImages}
        existingImages={images}
        uploadType={uploadType}
        soccerMatchData={soccerMatchData}
        selectedPlayers={selectedPlayers}
        musicEventData={musicEventData}
        onSoccerDataUpdate={(matchData, players) => {
          form.setValue('soccerMatchData', matchData);
          form.setValue('selectedPlayers', players);
        }}
        onMusicEventUpdate={(eventData) => form.setValue('musicEventData', eventData)}
      />
      
      {(images?.length || 0) > 0 && (
        <>
          <ImageGrid
            images={images || []}
            onImageUpdate={updateImage}
            onImageRemove={removeImage}
            onExportMetadata={onExportMetadata}
            onBulkEdit={onBulkEdit}
            onScrollToImage={onScrollToImage}
            onImageClick={onImageClick}
            musicEventData={musicEventData}
          />

          {/* Completion status */}
          {allImagesComplete && (
            <div className="bg-success/10 border border-success/20 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-success font-medium">✅ Images Ready</p>
                  <p className="text-muted-foreground text-sm mt-1">
                    All {images?.length || 0} images have complete metadata and are ready for the next step.
                  </p>
                </div>
                <button
                  onClick={handleCompleteStep}
                  className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
                >
                  Continue to Categories
                </button>
              </div>
            </div>
          )}

          {/* Progress indicator */}
          {!allImagesComplete && (
            <div className="bg-info/10 border border-info/20 rounded-lg p-4">
              <p className="text-info font-medium">📝 Images Progress</p>
              <p className="text-muted-foreground text-sm mt-1">
                {completedCount} of {images?.length || 0} images have complete metadata. 
                Complete all image metadata to proceed to the next step.
              </p>
              {(images?.length || 0) - completedCount > 0 && (
                <p className="text-muted-foreground text-xs mt-2">
                  Missing metadata for {(images?.length || 0) - completedCount} image(s). 
                  Each image needs at least a description and author{musicEventData?.eventType === 'festival' ? ', and selected band' : ''}.
                </p>
              )}
            </div>
          )}
        </>
      )}

      {/* Empty state */}
      {(images?.length || 0) === 0 && (
        <div className="text-center py-12 bg-muted/20 rounded-lg border-2 border-dashed border-muted-foreground/25">
          <div className="text-6xl mb-4">📷</div>
          <h3 className="text-xl font-semibold text-card-foreground mb-2">No Images Added Yet</h3>
          <p className="text-muted-foreground">
            Use the image uploader above to add photos for your {uploadType} event.
          </p>
        </div>
      )}
    </div>
  );
}