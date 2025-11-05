'use client';

import { useState } from 'react';
import { Edit3, Download } from 'lucide-react';
import { ImageFile } from '@/types';
import { MusicEventMetadata } from '@/types/music';
import ImageCard from './ImageCard';
import BulkEditModal from '../modals/BulkEditModal';

interface ImageGridProps {
  images: ImageFile[];
  onImageUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  onImageRemove: (id: string) => void;
  onImageClick: (image: ImageFile) => void;
  onExportMetadata: () => void;
  onBulkEdit: () => void;
  onScrollToImage: (imageId: string) => void;
  eventDetails?: any;
  bandPerformers?: any;
  musicEventData?: MusicEventMetadata; // Keep for backward compatibility
}

export default function ImageGrid({
  images,
  onImageUpdate,
  onImageRemove,
  onImageClick,
  onExportMetadata,
  eventDetails,
  bandPerformers,
  musicEventData
}: ImageGridProps) {
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [filterNoPerformers, setFilterNoPerformers] = useState(false);
  const [hiddenImages, setHiddenImages] = useState<Set<string>>(new Set());

  const handleBulkUpdate = (updates: Partial<ImageFile['metadata']>) => {
    images.forEach(image => {
      onImageUpdate(image.id, updates);
    });
  };

  const completedCount = images.filter(image => {
    if (!image.metadata) return false;

    const { description = '', author = '' } = image.metadata;

    // Minimum requirement: must have description
    // Author is auto-populated from EXIF or can be set in bulk edit
    const hasDescription = description.trim().length > 0;

    // Check if description is meaningful (not just language template wrapper)
    const hasRealDescription = hasDescription &&
      description !== '{{en|1=}}' &&
      description !== '{{en|1=Concert photograph}}';

    return hasRealDescription;
  }).length;

  // Filter images - exclude manually hidden ones when filter is active
  const filteredImages = filterNoPerformers
    ? images.filter(image => !hiddenImages.has(image.id))
    : images;

  const imagesWithoutPerformers = images.filter(
    img => !img.metadata?.selectedBandMembers || img.metadata.selectedBandMembers.length === 0
  ).length;

  // Toggle filter and clear hidden images when turning off
  const handleToggleFilter = () => {
    if (filterNoPerformers) {
      // Turning off - clear hidden list
      setHiddenImages(new Set());
    }
    setFilterNoPerformers(!filterNoPerformers);
  };

  const handleHideImage = (imageId: string) => {
    setHiddenImages(prev => new Set(prev).add(imageId));
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-card-foreground">
          Images ({images.length})
        </h2>
        <div className="flex items-center space-x-3">
          <div className="text-sm text-muted-foreground">
            {completedCount} of {images.length} ready
          </div>
          {imagesWithoutPerformers > 0 && (
            <button
              onClick={handleToggleFilter}
              className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors text-sm ${
                filterNoPerformers
                  ? 'bg-amber-600 text-white hover:bg-amber-700'
                  : 'bg-amber-100 text-amber-700 hover:bg-amber-200'
              }`}
              title={filterNoPerformers ? 'Click to show all images' : 'Click to show only images without performers'}
            >
              <span>
                {filterNoPerformers ? '✓ Filtering ' : ''}
                No performers ({imagesWithoutPerformers})
              </span>
            </button>
          )}
          <button
            onClick={() => setShowBulkEditModal(true)}
            className="flex items-center space-x-2 px-3 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>Bulk Edit</span>
          </button>
          <button
            onClick={onExportMetadata}
            className="flex items-center space-x-2 px-3 py-2 bg-secondary text-secondary-foreground rounded-md hover:bg-secondary/90 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Metadata</span>
          </button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 gap-6">
        {filteredImages.map((image, index) => (
          <ImageCard
            key={`image-${image.id}-${index}`}
            image={image}
            index={images.indexOf(image) + 1}
            onUpdate={onImageUpdate}
            onRemove={onImageRemove}
            onImageClick={onImageClick}
            eventDetails={eventDetails}
            bandPerformers={bandPerformers}
            musicEventData={musicEventData}
            showHideButton={filterNoPerformers}
            onHide={() => handleHideImage(image.id)}
          />
        ))}
      </div>

      <BulkEditModal
        images={images}
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        onBulkUpdate={handleBulkUpdate}
      />
    </div>
  );
}