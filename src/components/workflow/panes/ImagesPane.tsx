'use client';

import { ImagePlus } from 'lucide-react';
// import { ImageFile } from '@/types';
// import { MusicEventMetadata } from '@/types/music';
// import { SoccerMatchMetadata, SoccerPlayer } from '@/components/forms/SoccerMatchForm';
// import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { useUniversalForm, useUniversalFormFiles } from '@/providers/UniversalFormProvider';
import { useWorkflowUI } from '../providers/WorkflowUIProvider';
import ImageUploader from '@/components/upload/ImageUploader';
import ImageGrid from '@/components/image/ImageGrid';

interface ImagesPaneProps {
  onCompleteAction?: () => void;
}

export default function ImagesPane({
  onCompleteAction
}: ImagesPaneProps) {
  const { onExportMetadata, onBulkEdit, onScrollToImage, onImageClick } = useWorkflowUI();
  const { watch, setValue, getValues } = useUniversalForm();
  const filesForm = useUniversalFormFiles();
  
  // Get data from the unified form  
  const workflowType = watch('workflowType');
  const uploadType: 'music' = 'music';
  const eventType = workflowType === 'music-event' ? 'festival' : 'match';
  const eventDetails = watch('eventDetails');
  const organizations = watch('entities.organizations') || [];
  
  // Find the main band from organizations
  const selectedBandEntity = organizations.find((org: any) => 
    org.claims?.['P31']?.some((claim: any) => 
      ['Q215380', 'Q5741069'].includes(claim.mainsnak?.datavalue?.value?.id) // musical group, music band
    )
  );
  
  const bandPerformers = { 
    performers: watch('entities.people') || [],
    selectedBand: selectedBandEntity ? {
      name: selectedBandEntity.labels?.en?.value || selectedBandEntity.labels?.['en']?.value || '',
      id: selectedBandEntity.id
    } : null
  };
  
  // Get images from files.queue
  const images = filesForm.queue || [];
  const completedCount = (images || []).filter(image => {
    const description = (image.metadata as any)?.description || '';
    const author = (image.metadata as any)?.author || '';
    const selectedBand = (image.metadata as any)?.selectedBand;
    const hasBasicInfo = description.trim() && author.trim();
    
    // For music events, also require a selected band
    if (uploadType === 'music' && eventType === 'festival') {
      return hasBasicInfo && selectedBand?.trim();
    }
    
    return hasBasicInfo;
  }).length;

  const allImagesComplete = (images?.length || 0) > 0 && completedCount === (images?.length || 0);

  // Check if essential event details are missing
  const getMissingEventDetails = () => {
    const missing: string[] = [];
    
    if (uploadType === 'music' && eventType === 'festival') {
      if (!(bandPerformers as any)?.selectedBand?.name) {
        missing.push('Selected band/artist');
      }
      if (!eventDetails?.title) {
        missing.push('Festival name');
      }
    }
    
    return missing;
  };

  const missingDetails = getMissingEventDetails();
  const hasEventDetailsWarning = missingDetails.length > 0;

  const handleCompleteStep = () => {
    onCompleteAction?.();
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
        onImagesAddedAction={filesForm.addToQueue}
        existingImages={images as any}
        uploadType={uploadType}
        eventDetails={eventDetails}
        bandPerformers={bandPerformers}
        onMusicEventUpdateAction={(eventData: any) => {
          setValue('eventDetails', { ...eventDetails, ...eventData }, { shouldDirty: true });
        }}
      />
      
      {(images?.length || 0) > 0 && (
        <>
          <ImageGrid
            images={images as any || []}
            onImageUpdate={(id, updates) => {
              const currentQueue = getValues('files.queue') || [];
              const updatedQueue = currentQueue.map((img: any) => 
                img.id === id ? { ...img, ...updates } : img
              );
              setValue('files.queue', updatedQueue, { shouldDirty: true });
            }}
            onImageRemove={filesForm.removeFromQueue}
            onExportMetadata={onExportMetadata}
            onBulkEdit={onBulkEdit}
            onScrollToImage={onScrollToImage}
            onImageClick={onImageClick}
            eventDetails={eventDetails}
            bandPerformers={bandPerformers}
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
                  Each image needs at least a description and author{eventType === 'festival' ? ', and selected band' : ''}.
                </p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}