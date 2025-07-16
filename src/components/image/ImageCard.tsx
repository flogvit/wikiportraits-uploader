'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ImageFile } from '@/types';
import { MusicEventMetadata } from '@/types/music';
import { generateFilename } from '@/utils/commons-template';
import ImagePreview from './ImagePreview';
import ImageMetadataForm from '../forms/ImageMetadataForm';

interface ImageCardProps {
  image: ImageFile;
  index: number;
  onUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  onRemove: (id: string) => void;
  onImageClick: (image: ImageFile) => void;
  musicEventData?: MusicEventMetadata;
}

export default function ImageCard({ 
  image, 
  index, 
  onUpdate, 
  onRemove, 
  onImageClick, 
  musicEventData 
}: ImageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div id={`image-card-${image.id}`} className="bg-card rounded-lg shadow-lg overflow-hidden">
      <ImagePreview
        image={image}
        index={index}
        onImageClick={onImageClick}
        onRemove={onRemove}
        musicEventData={musicEventData}
      />

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-card-foreground truncate">
            {generateFilename(image, index)}
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
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

        {isExpanded && (
          <ImageMetadataForm
            image={image}
            index={index}
            onUpdate={onUpdate}
            musicEventData={musicEventData}
          />
        )}
      </div>
    </div>
  );
}