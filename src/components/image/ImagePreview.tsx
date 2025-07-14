'use client';

import { X } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { generateFilename } from '@/utils/commons-template';
import { MusicEventMetadata } from '@/types/music';

interface ImagePreviewProps {
  image: ImageFile;
  index: number;
  onImageClick: (image: ImageFile) => void;
  onRemove: (id: string) => void;
  musicEventData?: MusicEventMetadata;
}

export default function ImagePreview({ 
  image, 
  index, 
  onImageClick, 
  onRemove,
  musicEventData 
}: ImagePreviewProps) {
  const isComplete = () => {
    const { description, author, selectedBand } = image.metadata;
    const hasBasicInfo = description.trim() && author.trim();
    
    // For music events, also require a selected band
    if (musicEventData?.eventType === 'festival') {
      return hasBasicInfo && selectedBand?.trim();
    }
    
    return hasBasicInfo;
  };

  return (
    <div className="relative">
      <img
        src={image.preview}
        alt="Preview"
        className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
        onClick={() => onImageClick(image)}
        title="Click to view full image"
      />
      <button
        onClick={() => onRemove(image.id)}
        className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
      >
        <X className="w-4 h-4" />
      </button>
      <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
        isComplete() ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
      }`}>
        {isComplete() ? 'Ready' : 'Incomplete'}
      </div>
    </div>
  );
}