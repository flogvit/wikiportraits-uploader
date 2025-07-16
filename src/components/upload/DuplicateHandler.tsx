'use client';

import { useState } from 'react';
import { ImageFile } from '@/app/page';
import { detectDuplicates, DuplicateInfo } from '@/utils/duplicate-detection';
import DuplicateWarningModal from '../modals/DuplicateWarningModal';

interface DuplicateHandlerProps {
  onImagesProcessed: (images: ImageFile[]) => void;
  existingImages: ImageFile[];
}

export default function DuplicateHandler({ onImagesProcessed, existingImages }: DuplicateHandlerProps) {
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<ImageFile[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const _handleNewImages = (newImages: ImageFile[]) => {
    // Check for duplicates
    const duplicateResults = detectDuplicates(newImages, existingImages);
    
    if (duplicateResults.length > 0) {
      setDuplicates(duplicateResults);
      setPendingFiles(newImages);
      setShowDuplicateModal(true);
    } else {
      onImagesProcessed(newImages);
    }
  };

  const handleDuplicateDecision = (addAll: boolean) => {
    if (addAll) {
      onImagesProcessed(pendingFiles);
    }
    
    // Reset state
    setDuplicates([]);
    setPendingFiles([]);
    setShowDuplicateModal(false);
  };

  return (
    <>
      <DuplicateWarningModal
        isOpen={showDuplicateModal}
        onClose={() => setShowDuplicateModal(false)}
        duplicates={duplicates}
        onConfirm={handleDuplicateDecision}
      />
      {/* This component manages duplicate detection state */}
      {null}
    </>
  );
}

// Export the handler logic as a hook
export const useDuplicateHandler = (existingImages: ImageFile[]) => {
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<ImageFile[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);

  const checkForDuplicates = (newImages: ImageFile[]): boolean => {
    const duplicateResults = detectDuplicates(newImages, existingImages);
    
    if (duplicateResults.length > 0) {
      setDuplicates(duplicateResults);
      setPendingFiles(newImages);
      setShowDuplicateModal(true);
      return true;
    }
    
    return false;
  };

  const handleDuplicateDecision = (addAll: boolean): ImageFile[] => {
    const result = addAll ? pendingFiles : [];
    
    // Reset state
    setDuplicates([]);
    setPendingFiles([]);
    setShowDuplicateModal(false);
    
    return result;
  };

  return {
    duplicates,
    showDuplicateModal,
    checkForDuplicates,
    handleDuplicateDecision,
    closeDuplicateModal: () => setShowDuplicateModal(false)
  };
};