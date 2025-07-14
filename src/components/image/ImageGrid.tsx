'use client';

import { useState } from 'react';
import { Edit3, Download } from 'lucide-react';
import { ImageFile } from '@/app/page';
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
  musicEventData?: MusicEventMetadata;
}

export default function ImageGrid({ 
  images, 
  onImageUpdate, 
  onImageRemove, 
  onImageClick, 
  onExportMetadata, 
  onBulkEdit, 
  onScrollToImage,
  musicEventData 
}: ImageGridProps) {
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);

  const handleBulkUpdate = (updates: Partial<ImageFile['metadata']>) => {
    images.forEach(image => {
      const finalUpdates = { ...updates };
      
      // If username or fullName are being updated, automatically format the author field
      if (updates.authorUsername !== undefined || updates.authorFullName !== undefined) {
        const username = updates.authorUsername !== undefined ? updates.authorUsername : image.metadata.authorUsername;
        const fullName = updates.authorFullName !== undefined ? updates.authorFullName : image.metadata.authorFullName;
        
        let formattedAuthor = '';
        if (username && fullName) {
          formattedAuthor = `[[User:${username}|${fullName}]]`;
        } else if (fullName) {
          formattedAuthor = fullName;
        } else if (username) {
          formattedAuthor = `[[User:${username}]]`;
        }
        
        finalUpdates.author = formattedAuthor;
      }
      
      onImageUpdate(image.id, finalUpdates);
    });
  };

  const completedCount = images.filter(image => {
    const { description, author, selectedBand } = image.metadata;
    const hasBasicInfo = description.trim() && author.trim();
    
    // For music events, also require a selected band
    if (musicEventData?.eventType === 'festival') {
      return hasBasicInfo && selectedBand?.trim();
    }
    
    return hasBasicInfo;
  }).length;

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
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {images.map((image, index) => (
          <ImageCard
            key={image.id}
            image={image}
            index={index + 1}
            onUpdate={onImageUpdate}
            onRemove={onImageRemove}
            onImageClick={onImageClick}
            musicEventData={musicEventData}
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