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
  
  // Get images from files.queue (new uploads) and files.existing (from Commons)
  const existingImages = watch('files.existing') || [];
  const newImages = filesForm.queue || [];

  console.log('📦 newImages:', newImages.map((img: any) => ({ id: img.id, name: img.file?.name })));
  console.log('📦 existingImages:', existingImages.map((img: any) => ({ id: img.id, filename: img.filename })));

  // Combine existing and new images for display
  const allImages = [
    ...existingImages.map((img: any) => ({ ...img, isExisting: true })),
    ...newImages.map((img: any) => ({ ...img, isExisting: false }))
  ];

  const images = newImages; // Keep images as newImages for backward compatibility
  const completedCount = (images || []).filter(image => {
    if (!image.metadata) return false;

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

      {/* Image uploader at the top */}
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

      {/* Existing Images from Commons */}
      {existingImages.length > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Existing Images on Commons ({existingImages.length})
              </h3>
              <p className="text-sm text-blue-700 mt-1">
                These images already exist. You can edit their metadata but cannot delete them.
              </p>
            </div>
          </div>
          <div className="text-sm text-gray-600">
            Images will be displayed in the grid below with a blue indicator
          </div>
        </div>
      )}
      
      {allImages.length > 0 && (
        <>
          <ImageGrid
            images={allImages as any || []}
            onImageUpdate={(id, updates) => {
              // Check if this is an existing image or new image
              const isExisting = id.startsWith('existing-');

              console.log('📝 Updating image:', { id, updates, isExisting });

              if (isExisting) {
                // Update existing image metadata
                const currentExisting = getValues('files.existing') || [];
                const updatedExisting = currentExisting.map((img: any) =>
                  img.id === id ? { ...img, metadata: { ...img.metadata, ...updates } } : img
                );
                setValue('files.existing', updatedExisting, { shouldDirty: true });
              } else {
                // Update new image in queue
                const currentQueue = getValues('files.queue') || [];
                const updatedQueue = currentQueue.map((img: any) =>
                  img.id === id ? { ...img, metadata: { ...img.metadata, ...updates } } : img
                );
                setValue('files.queue', updatedQueue, { shouldDirty: true });
              }
            }}
            onImageRemove={(id) => {
              // Only allow removing new images, not existing ones
              console.log('🗑️ Remove image called with ID:', id);

              // Handle images without IDs by finding them in the array
              if (!id || id === 'undefined') {
                console.log('No valid ID, removing by finding image without ID');
                const currentQueue = getValues('files.queue') || [];
                const filtered = currentQueue.filter((img: any, idx: number) => {
                  // Remove the first image without an ID
                  if (!img.id || img.id === 'undefined') {
                    return idx !== 0; // Remove first match
                  }
                  return true;
                });
                setValue('files.queue', filtered, { shouldDirty: true });
                return;
              }

              const isExisting = id.startsWith('existing-');
              console.log('Is existing:', isExisting);
              if (!isExisting) {
                console.log('Removing from queue:', id);
                filesForm.removeFromQueue(id);
              } else {
                console.log('Cannot remove existing image');
              }
            }}
            onExportMetadata={onExportMetadata}
            onBulkEdit={onBulkEdit}
            onScrollToImage={onScrollToImage}
            onImageClick={onImageClick}
            eventDetails={eventDetails}
            bandPerformers={bandPerformers}
          />
        </>
      )}
    </div>
  );
}