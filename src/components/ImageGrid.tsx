'use client';

import { ImageFile } from '@/app/page';
import { MusicEventMetadata } from '@/types/music';
import ImageCard from './ImageCard';

interface ImageGridProps {
  images: ImageFile[];
  onImageUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  onImageRemove: (id: string) => void;
  onImageClick: (image: ImageFile) => void;
  musicEventData?: MusicEventMetadata;
}

export default function ImageGrid({ images, onImageUpdate, onImageRemove, onImageClick, musicEventData }: ImageGridProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">
          Images ({images.length})
        </h2>
        <div className="text-sm text-gray-500">
          Complete metadata for each image before uploading
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
    </div>
  );
}