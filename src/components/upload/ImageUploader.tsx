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

    // Check for duplicates
    const hasDuplicates = checkForDuplicates(imageFiles);
    
    if (!hasDuplicates) {
      onImagesAddedAction(imageFiles);
    }
  }, [uploadType, musicEventData, checkForDuplicates, onImagesAddedAction]);

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