'use client';

import { useCallback } from 'react';
import { ImageFile } from '@/app/page';
import { UploadType } from '../selectors/UploadTypeSelector';
import { SoccerMatchMetadata, SoccerPlayer } from '../forms/SoccerMatchForm';
import { MusicEventMetadata } from '@/types/music';
import FileDropzone from './FileDropzone';
import { FileProcessor } from './FileProcessor';
import { useDuplicateHandler } from './DuplicateHandler';
import DuplicateWarningModal from '../modals/DuplicateWarningModal';
import SoccerMatchWorkflow from '../workflow/workflows/SoccerMatchWorkflow';

interface ImageUploaderProps {
  onImagesAdded: (images: ImageFile[]) => void;
  existingImages: ImageFile[];
  uploadType: UploadType;
  soccerMatchData?: SoccerMatchMetadata | null;
  selectedPlayers?: SoccerPlayer[];
  musicEventData?: MusicEventMetadata | null;
  onSoccerDataUpdate?: (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => void;
  onMusicEventUpdate?: (eventData: MusicEventMetadata) => void;
}

export default function ImageUploader({ 
  onImagesAdded, 
  existingImages, 
  uploadType, 
  soccerMatchData, 
  selectedPlayers = [], 
  musicEventData, 
  onSoccerDataUpdate 
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
      soccerMatchData,
      selectedPlayers,
      musicEventData
    });

    // Process files to ImageFile objects
    const imageFiles = await processor.createImageFiles(files);

    // Check for duplicates
    const hasDuplicates = checkForDuplicates(imageFiles);
    
    if (!hasDuplicates) {
      onImagesAdded(imageFiles);
    }
  }, [uploadType, soccerMatchData, selectedPlayers, musicEventData, checkForDuplicates, onImagesAdded]);

  const handleDuplicateConfirm = (addAll: boolean) => {
    const imagesToAdd = handleDuplicateDecision(addAll);
    if (imagesToAdd.length > 0) {
      onImagesAdded(imagesToAdd);
    }
  };

  // Show soccer match workflow if soccer type and no match data
  if (uploadType === 'soccer' && !soccerMatchData) {
    return (
      <SoccerMatchWorkflow
        onMatchDataUpdate={onSoccerDataUpdate!}
        onImagesAdded={onImagesAdded}
        existingImages={existingImages}
      />
    );
  }

  return (
    <div className="space-y-6">
      <FileDropzone onFilesSelected={handleFilesSelected} />
      
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={closeDuplicateModal}
        duplicates={duplicates}
        onConfirm={handleDuplicateConfirm}
      />
    </div>
  );
}