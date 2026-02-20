'use client';

import { useState } from 'react';
import { ImageFile } from '@/types';
import { UniversalFormProvider, useUniversalForm } from '@/providers/UniversalFormProvider';
import { PublishDataProvider } from '@/providers/PublishDataProvider';
import { WorkflowUIProvider } from '../providers/WorkflowUIProvider';
import ExportModal from '@/components/modals/ExportModal';
import BulkEditModal from '@/components/modals/BulkEditModal';
import ImageModal from '@/components/modals/ImageModal';
import GeneralWorkflow from './GeneralWorkflow';

interface WikimediaWorkflowProps {
  // Props can be added here if needed in the future
}

// Internal component that handles modal state and UI operations
function WorkflowWithModals() {
  const { watch, setValue, getValues } = useUniversalForm();
  const images = watch('files.queue') || [];
  
  const updateImage = (imageId: string, updates: Partial<ImageFile>) => {
    const currentImages = getValues('files.queue') || [];
    const updatedImages = currentImages.map((img: any) => 
      img.id === imageId ? { ...img, ...updates } : img
    );
    setValue('files.queue', updatedImages, { shouldDirty: true });
  };
  const [showExportModal, setShowExportModal] = useState(false);
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<ImageFile | null>(null);

  const handleExportMetadata = () => {
    setShowExportModal(true);
  };

  const handleBulkEdit = () => {
    setShowBulkEditModal(true);
  };

  const handleScrollToImage = (imageId: string) => {
    const element = document.getElementById(`image-card-${imageId}`);
    if (element) {
      element.scrollIntoView({ 
        behavior: 'smooth', 
        block: 'center' 
      });
      // Add a brief highlight effect
      element.style.boxShadow = '0 0 0 3px rgba(59, 130, 246, 0.5)';
      setTimeout(() => {
        element.style.boxShadow = '';
      }, 2000);
    }
  };

  const handleImageClick = (image: ImageFile) => {
    setSelectedImage(image);
    setShowImageModal(true);
  };

  const handleBulkUpdate = (updates: any) => {
    images.forEach(img => {
      updateImage(img.id, {
        metadata: { ...img.metadata, ...updates }
      });
    });
  };

  const uiActions = {
    onExportMetadata: handleExportMetadata,
    onBulkEdit: handleBulkEdit,
    onScrollToImage: handleScrollToImage,
    onImageClick: handleImageClick,
  };

  return (
    <>
      <WorkflowUIProvider actions={uiActions}>
        <WorkflowRouter />
      </WorkflowUIProvider>
      
      {/* Modals */}
      <ExportModal
        images={images as any}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <BulkEditModal
        images={images as any}
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        onBulkUpdate={handleBulkUpdate}
      />

      {selectedImage && (
        <ImageModal
          image={selectedImage}
          isOpen={showImageModal}
          onClose={() => {
            setShowImageModal(false);
            setSelectedImage(null);
          }}
        />
      )}
    </>
  );
}

// Component that routes to the appropriate workflow
function WorkflowRouter() {
  const { watch } = useUniversalForm();
  const uploadType = watch('workflowType') === 'music-event' ? 'music' : 'general';

  const renderWorkflow = () => {
    switch (uploadType) {
      case 'general':
        return <GeneralWorkflow />;
        
      case 'music':
      default:
        return <GeneralWorkflow />;
    }
  };

  return renderWorkflow();
}

export default function WikimediaWorkflow(props: WikimediaWorkflowProps) {
  // No default workflowType - this will be selected in the upload-type step

  return (
    <UniversalFormProvider
      sessionId={`workflow-universal`}
      defaultValues={{
        eventDetails: {
          title: '',
          language: 'en'
        }
      }}
      autoSave={true}
    >
      <PublishDataProvider>
        <WorkflowWithModals />
      </PublishDataProvider>
    </UniversalFormProvider>
  );
}