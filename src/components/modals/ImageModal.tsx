'use client';

import { X } from 'lucide-react';
import { ImageFile } from '@/types';

interface ImageModalProps {
  image: ImageFile | null;
  isOpen: boolean;
  onClose: () => void;
}

export default function ImageModal({ image, isOpen, onClose }: ImageModalProps) {
  if (!isOpen || !image) return null;

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Handle both existing images and new uploads
  const isExisting = (image as any).isExisting === true;
  const imageUrl = (image as any).url || image.preview;
  const imageName = isExisting ? ((image as any).filename || 'Unknown') : (image.file?.name || 'Unknown');
  const imageSize = isExisting ? 'From Commons' : (image.file ? `${(image.file.size / 1024 / 1024).toFixed(2)} MB` : 'Unknown size');
  const imageType = isExisting ? 'Existing on Commons' : (image.file?.type || 'Unknown type');

  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="relative max-w-7xl max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-2 bg-black bg-opacity-50 text-white rounded-full hover:bg-opacity-75 transition-all"
        >
          <X className="w-6 h-6" />
        </button>

        <img
          src={imageUrl}
          alt={imageName}
          className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
        />

        <div className="absolute bottom-4 left-4 right-4 bg-black bg-opacity-50 text-white p-3 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-lg truncate">{imageName}</h3>
              <p className="text-sm text-gray-300">
                {imageSize} • {imageType}
              </p>
            </div>
            <div className="text-right text-sm text-gray-300">
              <p>Click outside to close</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}