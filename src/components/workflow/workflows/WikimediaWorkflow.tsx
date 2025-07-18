'use client';

import { useState } from 'react';
import { ImageFile } from '@/types';
import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { WorkflowFormProvider, useWorkflowForm } from '../providers/WorkflowFormProvider';
import { WorkflowUIProvider } from '../providers/WorkflowUIProvider';
import ExportModal from '@/components/modals/ExportModal';
import BulkEditModal from '@/components/modals/BulkEditModal';
import ImageModal from '@/components/modals/ImageModal';
import GeneralWorkflow from './GeneralWorkflow';
import SoccerWorkflow from './SoccerWorkflow';
import MusicWorkflow from './MusicWorkflow';
import PortraitsWorkflow from './PortraitsWorkflow';

interface WikimediaWorkflowProps {
  uploadType: UploadType;
}

// Internal component that handles modal state and UI operations
function WorkflowWithModals() {
  const { images, updateImage } = useWorkflowForm();
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

  const handleBulkUpdate = (updates: Partial<ImageFile['metadata']>) => {
    images.forEach(img => {
      updateImage(img.id, {
        ...img,
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
        images={images}
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
      />

      <BulkEditModal
        images={images}
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
  const { form } = useWorkflowForm();
  const uploadType = form.watch('uploadType');

  const renderWorkflow = () => {
    switch (uploadType) {
      case 'general':
        return <GeneralWorkflow />;
        
      case 'soccer':
        return <SoccerWorkflow />;
        
      case 'music':
        return <MusicWorkflow />;
        
      case 'portraits':
        return <PortraitsWorkflow />;
        
      default:
        return <GeneralWorkflow />;
    }
  };

  return renderWorkflow();
}

export default function WikimediaWorkflow({ 
  uploadType
}: WikimediaWorkflowProps) {
  return (
    <WorkflowFormProvider
      uploadType={uploadType}
    >
      <WorkflowWithModals />
    </WorkflowFormProvider>
  );
}