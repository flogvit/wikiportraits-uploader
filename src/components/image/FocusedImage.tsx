'use client';

import React, { useRef, useEffect, useState } from 'react';

interface FocusedImageProps {
  src: string;
  alt: string;
  className?: string;
  size?: number;
  onError?: (e: React.SyntheticEvent<HTMLImageElement>) => void;
}

export default function FocusedImage({ 
  src, 
  alt, 
  className = '', 
  size = 48,
  onError 
}: FocusedImageProps) {
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleImageLoad = () => {
    setImageLoaded(true);
    // Log cache status for debugging
    console.log(`🖼️ Image loaded: ${src}`);
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    setImageLoaded(false);
    console.log(`❌ Image failed to load: ${src}`);
    onError?.(e);
  };

  return (
    <div className={`relative ${className}`}>
      <img
        src={src}
        alt={alt}
        onLoad={handleImageLoad}
        onError={handleImageError}
        className="rounded-full object-cover"
        style={{ width: size, height: size }}
      />
      
      {/* Loading indicator */}
      {!imageLoaded && (
        <div 
          className="absolute inset-0 flex items-center justify-center bg-gray-200 rounded-full"
          style={{ width: size, height: size }}
        >
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
        </div>
      )}
    </div>
  );
}