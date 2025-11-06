'use client';

import { useCallback } from 'react';
import { ImageFile } from '@/types';
import { UploadType } from '@/types/upload';
import { MusicEventMetadata } from '@/types/music';
import FileDropzone from './FileDropzone';
import { FileProcessor } from './FileProcessor';
import { useDuplicateHandler } from './DuplicateHandler';
import DuplicateWarningModal from '../modals/DuplicateWarningModal';

interface ImageUploaderProps {
  onImagesAddedAction: (images: ImageFile[]) => void;
  existingImages: ImageFile[];
  uploadType: UploadType;
  eventDetails?: any;
  bandPerformers?: any;
  musicEventData?: MusicEventMetadata | null;
  onMusicEventUpdateAction?: (eventData: MusicEventMetadata) => void;
}

export default function ImageUploader({ 
  onImagesAddedAction, 
  existingImages, 
  uploadType, 
  eventDetails,
  bandPerformers,
  musicEventData, 
  onMusicEventUpdateAction 
}: ImageUploaderProps) {
  const {
    duplicates,
    showDuplicateModal,
    checkForDuplicates,
    handleDuplicateDecision,
    closeDuplicateModal
  } = useDuplicateHandler(existingImages);

  const handleFilesSelected = useCallback(async (files: File[]) => {
    if (files.length === 0) return;

    // Create file processor
    const processor = FileProcessor.createProcessor({
      uploadType,
      musicEventData
    });

    // Process files to ImageFile objects
    const imageFiles = await processor.createImageFiles(files);

    // Import utilities
    const { generateImageCategories } = await import('@/utils/music-categories');
    const { generateCommonsWikitext } = await import('@/utils/commons-template');
    const { generateCommonsFilename } = await import('@/utils/commons-filename');
    const { generateMusicEventDescription } = await import('@/utils/commons-description');
    const { generateTemplateParameters, getYearFromDate } = await import('@/utils/wikiportraits-templates');

    // Auto-populate categories, filename, and description for each image
    if (eventDetails?.title) {
      const mainBandName = bandPerformers?.selectedBand?.name;

      for (let index = 0; index < imageFiles.length; index++) {
        const imageFile = imageFiles[index];

        // Use the image's EXIF date if available, otherwise fall back to event date
        const imageDate = imageFile.metadata?.date || eventDetails?.date;

        console.log(`🖼️ Image ${index + 1} date info:`, {
          exifDate: imageFile.metadata?.date,
          eventDate: eventDetails?.date,
          usingDate: imageDate
        });

        // Build form data for utilities with the correct date
        // Include both the band/organization and individual performers
        const bandOrganization = bandPerformers?.selectedBand ? [{
          entity: {
            id: bandPerformers.selectedBand.id,
            labels: {
              en: {
                language: 'en' as const,
                value: bandPerformers.selectedBand.name
              }
            }
          },
          roles: ['band'],
          isNew: false,
          metadata: {}
        }] : [];

        const formData = {
          workflowType: 'music-event',
          eventDetails: {
            ...eventDetails,
            date: imageDate // Use image-specific date
          },
          entities: {
            people: bandPerformers?.members || [],
            organizations: bandOrganization,
            locations: [],
            events: []
          }
        };

        // 1. Generate Commons-compliant filename
        // Collect already suggested filenames to avoid duplicates
        const existingFilenames = imageFiles
          .slice(0, index)
          .map((img: any) => img.metadata?.suggestedFilename)
          .filter(Boolean);

        const newFilename = await generateCommonsFilename(imageFile.file.name, formData as any, index, existingFilenames);
        imageFile.metadata.suggestedFilename = newFilename;
        console.log(`📝 Suggested filename: ${imageFile.file.name} → ${newFilename}`);

        // 2. Generate standard description
        if (!imageFile.metadata.description || imageFile.metadata.description.trim() === '') {
          const description = generateMusicEventDescription(formData as any);
          imageFile.metadata.description = description;
          console.log(`📝 Auto-generated description: ${description}`);
        }

        // 3. Auto-populate categories
        const eventCategories = generateImageCategories(eventDetails, mainBandName);
        console.log('📁 Auto-populating categories on upload with band:', mainBandName, 'Categories:', eventCategories);
        imageFile.metadata.categories = eventCategories;

        // 4. Add WikiPortraits template (uses standard template with parameters)
        const year = getYearFromDate(imageDate);
        const templateUsage = generateTemplateParameters(eventDetails, year);

        // Store template usage in metadata so it can be included in wikitext generation
        imageFile.metadata.wikiportraitsTemplate = templateUsage;
        imageFile.metadata.wikiportraitsYear = year;

        // Generate wikitext with WikiPortraits template included
        // We'll need to pass isWikiPortraitsJob flag - for now we'll regenerate in the next step
        imageFile.metadata.wikitext = `${templateUsage}\n${generateCommonsWikitext(imageFile)}`;

        console.log('📝 Added WikiPortraits template:', templateUsage);
        console.log('📝 Regenerated wikitext with categories and template');
      }
    }

    // Check for duplicates
    const hasDuplicates = checkForDuplicates(imageFiles);

    if (!hasDuplicates) {
      onImagesAddedAction(imageFiles);
    }
  }, [uploadType, musicEventData, eventDetails, bandPerformers, checkForDuplicates, onImagesAddedAction]);

  const handleDuplicateConfirm = (addAll: boolean) => {
    const imagesToAdd = handleDuplicateDecision(addAll);
    if (imagesToAdd.length > 0) {
      onImagesAddedAction(imagesToAdd);
    }
  };

  // Only supporting music upload type

  return (
    <div className="space-y-6">
      <FileDropzone onFilesSelected={handleFilesSelected} />
      
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={closeDuplicateModal}
        duplicates={duplicates}
        onAddAnyway={() => handleDuplicateConfirm(true)}
      />
    </div>
  );
}