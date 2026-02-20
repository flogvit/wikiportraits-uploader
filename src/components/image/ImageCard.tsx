'use client';

import { useState, useRef, useEffect } from 'react';
import { ChevronDown, ChevronUp, Edit2, Check, X, EyeOff, AlertTriangle } from 'lucide-react';
import { ImageFile } from '@/types';
import { MusicEventMetadata } from '@/types/music';
import { generateFilename } from '@/utils/commons-template';
import ImagePreview from './ImagePreview';
import ImageMetadataForm from '../forms/ImageMetadataForm';
import CompactPerformerSelector from './CompactPerformerSelector';
import { logger } from '@/utils/logger';

interface ImageCardProps {
  image: ImageFile;
  index: number;
  onUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  onRemove: (id: string) => void;
  onImageClick: (image: ImageFile) => void;
  eventDetails?: any;
  bandPerformers?: any;
  musicEventData?: MusicEventMetadata; // Keep for backward compatibility
  showHideButton?: boolean;
  onHide?: () => void;
}

export default function ImageCard({
  image,
  index,
  onUpdate,
  onRemove,
  onImageClick,
  eventDetails,
  bandPerformers,
  musicEventData,
  showHideButton,
  onHide
}: ImageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isEditingFilename, setIsEditingFilename] = useState(false);
  const [editedFilename, setEditedFilename] = useState('');
  const filenameInputRef = useRef<HTMLInputElement>(null);
  const isExisting = (image as any).isExisting === true;

  // Get current filename - ensure it's not a Promise
  const suggestedFilename = image.metadata?.suggestedFilename;
  if (suggestedFilename && typeof suggestedFilename === 'object' && 'then' in (suggestedFilename as any)) {
    logger.error('ImageCard', 'suggestedFilename is a Promise!', suggestedFilename);
  }
  const currentFilename = (typeof suggestedFilename === 'string' ? suggestedFilename : '') || generateFilename(image, index, musicEventData);

  // Focus input when editing starts
  useEffect(() => {
    if (isEditingFilename && filenameInputRef.current) {
      filenameInputRef.current.focus();
      filenameInputRef.current.select();
    }
  }, [isEditingFilename]);

  // Get file extension from original filename
  const getFileExtension = (filename: string): string => {
    const lastDot = filename.lastIndexOf('.');
    return lastDot > 0 ? filename.substring(lastDot) : '.jpg'; // Default to .jpg if no extension
  };

  const handleFilenameEdit = () => {
    setEditedFilename(currentFilename);
    setIsEditingFilename(true);
  };

  const handleFilenameSave = () => {
    if (editedFilename.trim()) {
      // Get the original extension
      const originalExt = getFileExtension(image.file.name);
      let newFilename = editedFilename.trim();

      // Remove any extension the user might have typed
      const lastDot = newFilename.lastIndexOf('.');
      if (lastDot > 0) {
        newFilename = newFilename.substring(0, lastDot);
      }

      // Always append the original extension
      newFilename = newFilename + originalExt;

      logger.debug('ImageCard', 'Saving filename', {
        imageId: image.id,
        oldFilename: currentFilename,
        userInput: editedFilename.trim(),
        newFilename: newFilename,
        extension: originalExt
      });

      onUpdate(image.id, { suggestedFilename: newFilename });
    }
    setIsEditingFilename(false);
  };

  const handleFilenameCancel = () => {
    setIsEditingFilename(false);
    setEditedFilename('');
  };

  const handleFilenameKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleFilenameSave();
    } else if (e.key === 'Escape') {
      handleFilenameCancel();
    }
  };

  // Handle performer changes and regenerate filename/description
  const handlePerformerChange = async (imageId: string, memberIds: string[]) => {
    logger.debug('ImageCard', 'Performer change triggered', { imageId, memberIds, bandPerformers });

    // Regenerate filename and description
    try {
      const { generateCommonsFilename } = await import('@/utils/commons-filename');
      const { generateMusicEventDescription } = await import('@/utils/commons-description');

      logger.debug('ImageCard', 'Available performers', bandPerformers?.performers);
      logger.debug('ImageCard', 'Looking for memberIds', memberIds);

      // Get selected performers - bandPerformers.performers contains UniversalFormEntity objects
      const selectedPerformersRaw = bandPerformers?.performers?.filter((p: any) => {
        const performerId = p.entity?.id || p.id;
        return memberIds.includes(performerId);
      }) || [];

      // Convert to the format expected by description generator
      const selectedPerformers = selectedPerformersRaw.map((p: any) => {
        // Try all possible paths to get the performer name
        const performerName =
          p.entity?.labels?.en?.value ||  // Full structure
          p.entity?.labels?.en ||         // If en is the string directly
          p.labels?.en?.value ||          // Without entity wrapper
          p.labels?.en ||                 // Without entity wrapper, en is string
          p.name ||                       // Flattened structure
          p.entity?.id ||                 // Fallback to ID
          p.id ||                         // Last resort
          'Unknown';

        logger.debug('ImageCard', 'Getting name for performer', { id: p.entity?.id || p.id, name: performerName });

        return {
          entity: {
            id: p.entity?.id || p.id,
            labels: {
              en: {
                language: 'en' as const,
                value: performerName
              }
            }
          },
          roles: p.roles || [],
          isNew: p.isNew || false,
          metadata: p.metadata || {}
        };
      });

      logger.debug('ImageCard', 'Selected performers', selectedPerformers.map((p: any) => ({
        id: p.entity.id,
        name: p.entity.labels.en.value
      })));

      // Build formData for description generation
      const bandOrganization = bandPerformers?.selectedBand ? [{
        entity: {
          id: bandPerformers.selectedBand.id,
          labels: {
            en: {
              language: 'en' as const,
              value: bandPerformers.selectedBand.name
            }
          }
        }
      }] : [];

      const formData = {
        workflowType: 'music-event',
        eventDetails: {
          ...eventDetails,
          date: image.metadata?.date || eventDetails?.date
        },
        entities: {
          people: selectedPerformers,
          organizations: bandOrganization,
          locations: [],
          events: []
        }
      };

      // Generate new description with performers
      const newDescription = generateMusicEventDescription(formData as any);

      // Prepare updates object
      const updates: any = {
        selectedBandMembers: memberIds,
        description: newDescription.replace(/\{\{[^}]+\|1=([^}]+)\}\}/, '$1') // Store plain description
      };

      // For new images, also regenerate filename
      if (!isExisting && image.file) {
        const newFilename = await generateCommonsFilename(image.file.name, formData as any, index);
        updates.suggestedFilename = newFilename;
      }

      logger.debug('ImageCard', `Updating ${isExisting ? 'existing' : 'new'} image`, Object.keys(updates));

      // Central data in ImagesPane will handle categories and wikitext regeneration
      onUpdate(image.id, updates);
    } catch (error) {
      logger.error('ImageCard', 'Failed to regenerate filename/description', error);
    }
  };

  return (
    <div
      id={`image-card-${image.id}`}
      className={`rounded-lg shadow-lg overflow-hidden ${
        isExisting
          ? 'bg-blue-50 border-2 border-blue-300'
          : 'bg-card border-2 border-green-300'
      }`}
    >
      {/* Status Badge */}
      <div className={`px-3 py-1 text-xs font-medium flex items-center justify-between ${
        isExisting
          ? 'bg-blue-600 text-white'
          : 'bg-green-600 text-white'
      }`}>
        <span>{isExisting ? '📁 Existing on Commons' : '✨ New Upload'}</span>
        {image.metadata?.metadataStripped && (
          <span className="flex items-center gap-1 bg-yellow-500 text-yellow-900 px-2 py-0.5 rounded">
            <AlertTriangle className="w-3 h-3" />
            EXIF Stripped
          </span>
        )}
      </div>

      <ImagePreview
        image={image}
        index={index}
        onImageClick={onImageClick}
        onRemove={isExisting ? undefined : onRemove} // Disable remove for existing images
        musicEventData={musicEventData}
      />

      <div className="p-4">
        <div className="flex items-center justify-between gap-2 mb-4">
          {/* Editable filename */}
          {isEditingFilename ? (
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <input
                ref={filenameInputRef}
                type="text"
                value={editedFilename}
                onChange={(e) => setEditedFilename(e.target.value)}
                onKeyDown={handleFilenameKeyDown}
                className="flex-1 px-2 py-1 text-sm font-semibold border border-primary rounded focus:outline-none focus:ring-2 focus:ring-primary"
              />
              <button
                onClick={handleFilenameSave}
                className="p-1 text-green-600 hover:text-green-700"
                title="Save"
              >
                <Check className="w-4 h-4" />
              </button>
              <button
                onClick={handleFilenameCancel}
                className="p-1 text-red-600 hover:text-red-700"
                title="Cancel"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button
              onClick={handleFilenameEdit}
              className="flex items-center gap-2 flex-1 min-w-0 text-left group"
              title="Click to edit filename"
            >
              <h3 className="font-semibold text-card-foreground truncate">
                {currentFilename}
              </h3>
              <Edit2 className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
            </button>
          )}

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground flex-shrink-0"
          >
            {isExpanded ? (
              <>
                <span>Collapse</span>
                <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                <span>Expand</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {/* Performer selector - always visible in same position */}
        <CompactPerformerSelector
          image={image}
          eventDetails={eventDetails}
          bandPerformers={bandPerformers}
          musicEventData={musicEventData}
          onMembersChange={handlePerformerChange}
        />

        {/* P18 (main image) selection */}
        {bandPerformers?.selectedBand && (() => {
          // Check if band already has P18 (image)
          const bandEntity = bandPerformers.selectedBand.entity;
          const hasExistingP18 = bandEntity?.claims?.P18?.length > 0;
          const existingImageCount = bandEntity?.claims?.P18?.length || 0;

          return (
            <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={image.metadata?.setAsMainImage || false}
                  onChange={(e) => {
                    onUpdate(image.id, { setAsMainImage: e.target.checked });
                  }}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <div className="flex-1">
                  <span className="text-sm font-medium text-blue-900">
                    {hasExistingP18
                      ? `Add as alternative image for ${bandPerformers.selectedBand.name}`
                      : `Set as main image for ${bandPerformers.selectedBand.name}`
                    }
                  </span>
                  <p className="text-xs text-blue-700 mt-0.5">
                    {hasExistingP18
                      ? `Add P18 (image) to ${bandPerformers.selectedBand.id} • ${existingImageCount} image${existingImageCount > 1 ? 's' : ''} already exist${existingImageCount === 1 ? 's' : ''}`
                      : `Add P18 (image) to ${bandPerformers.selectedBand.id} • No image currently set`
                    }
                  </p>
                  {hasExistingP18 && (
                    <p className="text-xs text-blue-600 mt-1">
                      ℹ️ This will be added with normal rank. The Wikidata community can adjust rankings.
                    </p>
                  )}
                </div>
              </label>
            </div>
          );
        })()}

        {/* Metadata warnings */}
        {image.metadata?.metadataStripped && image.metadata?.metadataWarnings && (
          <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-yellow-800">Metadata Warning</p>
                <ul className="text-xs text-yellow-700 mt-1 space-y-1">
                  {image.metadata.metadataWarnings.map((warning, idx) => (
                    <li key={idx}>• {warning}</li>
                  ))}
                </ul>
                <p className="text-xs text-yellow-600 mt-2">
                  ⚠️ Commons prefers images with original EXIF metadata for attribution and documentation.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Hide button when filter is active */}
        {showHideButton && (
          <button
            onClick={onHide}
            className="mt-3 w-full flex items-center justify-center gap-2 px-3 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors text-sm"
          >
            <EyeOff className="w-4 h-4" />
            <span>Hide this image</span>
          </button>
        )}

        {isExpanded && (
          <ImageMetadataForm
            image={image}
            index={index}
            onUpdate={onUpdate}
            eventDetails={eventDetails}
            bandPerformers={bandPerformers}
            musicEventData={musicEventData}
          />
        )}
      </div>
    </div>
  );
}