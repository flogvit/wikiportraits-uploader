'use client';

import { ImagePlus } from 'lucide-react';
import { logger } from '@/utils/logger';
import { useUniversalForm, useUniversalFormFiles } from '@/providers/UniversalFormProvider';
import { usePublishData } from '@/providers/PublishDataProvider';
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
  const { imageActions } = usePublishData();

  // Get data from the unified form
  const workflowType = watch('workflowType');
  const uploadType: 'music' = 'music';
  const eventType = workflowType === 'music-event' ? 'festival' : 'match';
  const eventDetails = watch('eventDetails');
  const isWikiPortraitsJob = watch('isWikiPortraitsJob');
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
      id: selectedBandEntity.id,
      entity: selectedBandEntity // Include full entity for P18 checking
    } : null
  };
  
  // Get images from files.queue (new uploads) and files.existing (from Commons)
  const existingImages = watch('files.existing') || [];
  const newImages = filesForm.queue || [];

  // Combine existing and new images for display (new images on top)
  const allImages = [
    ...newImages.map((img: any) => ({ ...img, isExisting: false })),
    ...existingImages.map((img: any) => ({ ...img, isExisting: true }))
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

      {/* Personality Rights Permission - applies to all images */}
      {allImages.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
          <h3 className="font-semibold text-gray-900 mb-2 flex items-center gap-2">
            <svg className="w-5 h-5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            Personality Rights Permission
          </h3>
          <p className="text-sm text-gray-700 mb-3">
            If these images show people, add permission information to avoid personality rights warnings
          </p>
          <div className="space-y-3">
            <label className="flex items-start gap-2">
              <input
                type="checkbox"
                checked={(watch as any)('eventDetails.hasPersonalityRightsPermission') || false}
                onChange={(e) => {
                  (setValue as any)('eventDetails.hasPersonalityRightsPermission', e.target.checked);

                  if (e.target.checked) {
                    // Apply permission to all images
                    const permissionText = (getValues as any)('eventDetails.permissionText') || 'Permission granted by the band via messenger communication. Available upon request.';
                    const permissionTemplate = `{{Personality rights}}`;

                    // Update all new images
                    const updatedQueue = (getValues('files.queue') || []).map((img: any) => {
                      // Update wikitext: set permission field to plain text and add template after Information block
                      let updatedWikitext = img.metadata?.wikitext || '';
                      if (updatedWikitext && !img.metadata?.permissionOverride) {
                        // Update the permission field with plain text
                        updatedWikitext = updatedWikitext.replace(
                          /\|permission=([^\n]*)/,
                          `|permission=${permissionText}`
                        );
                        // Add Personality rights template after Information block if not already present
                        if (!updatedWikitext.includes('{{Personality rights}}')) {
                          updatedWikitext = updatedWikitext.replace(
                            /(\}\})\n(=={{int:license-header}}==)/,
                            `$1\n${permissionTemplate}\n$2`
                          );
                        }
                      }

                      return {
                        ...img,
                        metadata: {
                          ...img.metadata,
                          permission: img.metadata?.permissionOverride || permissionText,
                          personalityRightsTemplate: permissionTemplate,
                          wikitext: updatedWikitext || img.metadata?.wikitext,
                          wikitextModified: !!updatedWikitext
                        }
                      };
                    });
                    setValue('files.queue', updatedQueue, { shouldDirty: true });

                    // Update all existing images
                    const updatedExisting = (getValues('files.existing') || []).map((img: any) => {
                      // Update wikitext: set permission field to plain text and add template after Information block
                      let updatedWikitext = img.metadata?.wikitext || '';
                      if (updatedWikitext && !img.metadata?.permissionOverride) {
                        // Update the permission field with plain text
                        updatedWikitext = updatedWikitext.replace(
                          /\|permission=([^\n]*)/,
                          `|permission=${permissionText}`
                        );
                        // Add Personality rights template after Information block if not already present
                        if (!updatedWikitext.includes('{{Personality rights}}')) {
                          updatedWikitext = updatedWikitext.replace(
                            /(\}\})\n(=={{int:license-header}}==)/,
                            `$1\n${permissionTemplate}\n$2`
                          );
                        }
                      }

                      return {
                        ...img,
                        metadata: {
                          ...img.metadata,
                          permission: img.metadata?.permissionOverride || permissionText,
                          personalityRightsTemplate: permissionTemplate,
                          wikitext: updatedWikitext,
                          wikitextModified: true
                        }
                      };
                    });
                    setValue('files.existing', updatedExisting, { shouldDirty: true });
                  } else {
                    // Remove permission from all images that don't have override
                    const updatedQueue = (getValues('files.queue') || []).map((img: any) => {
                      // Update wikitext to remove permission
                      let updatedWikitext = img.metadata?.wikitext || '';
                      if (updatedWikitext && !img.metadata?.permissionOverride) {
                        updatedWikitext = updatedWikitext.replace(
                          /\|permission=([^\n]*)/,
                          '|permission='
                        );
                      }

                      return {
                        ...img,
                        metadata: {
                          ...img.metadata,
                          permission: img.metadata?.permissionOverride || '',
                          wikitext: updatedWikitext || img.metadata?.wikitext,
                          wikitextModified: !!updatedWikitext
                        }
                      };
                    });
                    setValue('files.queue', updatedQueue, { shouldDirty: true });

                    const updatedExisting = (getValues('files.existing') || []).map((img: any) => {
                      // Update wikitext to remove permission
                      let updatedWikitext = img.metadata?.wikitext || '';
                      if (updatedWikitext && !img.metadata?.permissionOverride) {
                        updatedWikitext = updatedWikitext.replace(
                          /\|permission=([^\n]*)/,
                          '|permission='
                        );
                      }

                      return {
                        ...img,
                        metadata: {
                          ...img.metadata,
                          permission: img.metadata?.permissionOverride || '',
                          wikitext: updatedWikitext,
                          wikitextModified: true
                        }
                      };
                    });
                    setValue('files.existing', updatedExisting, { shouldDirty: true });
                  }
                }}
                className="mt-1 w-4 h-4 text-amber-600 rounded"
              />
              <div className="flex-1">
                <span className="text-sm font-medium text-gray-900">
                  I have permission to publish images showing people at this event
                </span>
              </div>
            </label>

            {(watch as any)('eventDetails.hasPersonalityRightsPermission') && (
              <div className="ml-6 space-y-2">
                <label className="block">
                  <span className="text-sm text-gray-700">Permission details:</span>
                  <textarea
                    value={(watch as any)('eventDetails.permissionText') || 'Permission granted by the band via messenger communication. Available upon request.'}
                    onChange={(e) => {
                      const permissionText = e.target.value;
                      (setValue as any)('eventDetails.permissionText', permissionText);

                      // Use plain text permission with consent statement
                      const permissionTemplate = `${permissionText}`;

                      // Update all new images
                      const updatedQueue = (getValues('files.queue') || []).map((img: any) => {
                        // Update wikitext permission field if exists
                        let updatedWikitext = img.metadata?.wikitext || '';
                        if (updatedWikitext && !img.metadata?.permissionOverride) {
                          updatedWikitext = updatedWikitext.replace(
                            /\|permission=([^\n]*)/,
                            `|permission=${permissionTemplate}`
                          );
                        }

                        return {
                          ...img,
                          metadata: {
                            ...img.metadata,
                            permission: img.metadata?.permissionOverride || permissionTemplate,
                            wikitext: updatedWikitext || img.metadata?.wikitext,
                            wikitextModified: !!updatedWikitext
                          }
                        };
                      });
                      setValue('files.queue', updatedQueue, { shouldDirty: true });

                      // Update all existing images
                      const updatedExisting = (getValues('files.existing') || []).map((img: any) => {
                        // Update wikitext permission field
                        let updatedWikitext = img.metadata?.wikitext || '';
                        if (updatedWikitext && !img.metadata?.permissionOverride) {
                          updatedWikitext = updatedWikitext.replace(
                            /\|permission=([^\n]*)/,
                            `|permission=${permissionTemplate}`
                          );
                        }

                        return {
                          ...img,
                          metadata: {
                            ...img.metadata,
                            permission: img.metadata?.permissionOverride || permissionTemplate,
                            wikitext: updatedWikitext,
                            wikitextModified: true
                          }
                        };
                      });
                      setValue('files.existing', updatedExisting, { shouldDirty: true });
                    }}
                    className="w-full mt-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    rows={2}
                    placeholder="Describe how you obtained permission..."
                  />
                </label>
                <p className="text-xs text-gray-600">
                  Will be added to the permission field as plain text (visible on Commons page)
                </p>
                <p className="text-xs text-amber-700">
                  💡 You can override this on individual images in their expanded metadata forms
                </p>
              </div>
            )}
          </div>
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

              logger.debug('ImagesPane', 'Posting update to central data', { id, updates, isExisting });

              // Check for Promise values
              Object.entries(updates).forEach(([key, value]) => {
                if (value && typeof value === 'object' && 'then' in value) {
                  logger.error('ImagesPane', `updates.${key} is a Promise!`, value);
                }
              });

              // Simply POST the changes to central data (UniversalFormProvider)
              // The provider's useEffect will handle automatic calculations
              if (isExisting) {
                const currentExisting = getValues('files.existing') || [];
                const updatedExisting = currentExisting.map((img: any) =>
                  img.id === id ? { ...img, metadata: { ...img.metadata, ...updates } } : img
                );
                setValue('files.existing', updatedExisting, { shouldDirty: true });
              } else {
                const currentQueue = getValues('files.queue') || [];
                const updatedQueue = currentQueue.map((img: any) =>
                  img.id === id ? { ...img, metadata: { ...img.metadata, ...updates } } : img
                );
                setValue('files.queue', updatedQueue, { shouldDirty: true });
              }
            }}
            onImageRemove={(id) => {
              // Only allow removing new images, not existing ones
              logger.debug('ImagesPane', 'Remove image called with ID', id);

              // Handle images without IDs by finding them in the array
              if (!id || id === 'undefined') {
                logger.debug('ImagesPane', 'No valid ID, removing by finding image without ID');
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
              logger.debug('ImagesPane', 'Is existing', isExisting);
              if (!isExisting) {
                logger.debug('ImagesPane', 'Removing from queue', id);
                filesForm.removeFromQueue(id);
              } else {
                logger.debug('ImagesPane', 'Cannot remove existing image');
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