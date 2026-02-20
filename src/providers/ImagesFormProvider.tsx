'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';
import { logger } from '@/utils/logger';

interface ImageMetadata {
  id: string;
  file: File;
  filename: string;
  originalName: string;
  size: number;
  type: string;
  url?: string;
  description?: string;
  author?: string;
  date?: string;
  source?: string;
  license?: string;
  categories?: string[];
  uploadProgress?: number;
  uploadStatus?: 'pending' | 'uploading' | 'completed' | 'failed';
  error?: string;
  wikidataEntities?: string[]; // Q-IDs of entities depicted
}

interface ValidationRule {
  type: 'file-type' | 'file-size' | 'min-resolution' | 'max-resolution';
  [key: string]: any;
}

interface ImagesFormContextType {
  getImages: () => ImageMetadata[];
  add: (image: File | ImageMetadata) => void;
  remove: (imageId: string) => void;
  updateMetadata: (imageId: string, metadata: Partial<ImageMetadata>) => void;
  validate: () => boolean;
  getProgress: () => { total: number; completed: number; failed: number };
  clear: () => void;
}

const ImagesFormContext = createContext<ImagesFormContextType | undefined>(undefined);

export function useImagesForm(): ImagesFormContextType {
  const context = useContext(ImagesFormContext);
  if (!context) {
    throw new Error('useImagesForm must be used within an ImagesFormProvider');
  }
  return context;
}

interface ImagesFormProviderProps {
  children: React.ReactNode;
  config?: {
    validationRules?: ValidationRule[];
    maxFiles?: number;
    maxFileSize?: number;
    allowedTypes?: string[];
  };
}

export function ImagesFormProvider({ children, config }: ImagesFormProviderProps) {
  const form = useFormContext();
  const FORM_KEY = 'images';

  // Initialize images if not present
  useEffect(() => {
    if (!form.getValues(FORM_KEY)) {
      form.setValue(FORM_KEY, []);
    }
  }, [form]);

  const getImages = useCallback((): ImageMetadata[] => {
    return form.getValues(FORM_KEY) || [];
  }, [form]);

  const add = useCallback((image: File | ImageMetadata) => {
    const images = getImages();
    
    let newImage: ImageMetadata;
    if (image instanceof File) {
      newImage = {
        id: `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        file: image,
        filename: image.name,
        originalName: image.name,
        size: image.size,
        type: image.type,
        url: URL.createObjectURL(image),
        uploadStatus: 'pending'
      };
    } else {
      newImage = {
        ...image,
        id: image.id || `img_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        uploadStatus: image.uploadStatus || 'pending'
      };
    }

    // Validate the image
    const validationError = validateImage(newImage, config);
    if (validationError) {
      logger.warn('ImagesFormProvider', 'Image validation failed', validationError);
      newImage.error = validationError;
      newImage.uploadStatus = 'failed';
    }

    // Check file limits
    if (config?.maxFiles && images.length >= config.maxFiles) {
      logger.warn('ImagesFormProvider', 'Maximum file limit reached');
      return;
    }

    const updatedImages = [...images, newImage];
    form.setValue(FORM_KEY, updatedImages);
    logger.debug('ImagesFormProvider', 'Added image', newImage.filename);
  }, [form, getImages, config]);

  const remove = useCallback((imageId: string) => {
    const images = getImages();
    const imageToRemove = images.find(img => img.id === imageId);
    
    // Clean up object URL
    if (imageToRemove?.url && imageToRemove.url.startsWith('blob:')) {
      URL.revokeObjectURL(imageToRemove.url);
    }

    const updatedImages = images.filter(img => img.id !== imageId);
    form.setValue(FORM_KEY, updatedImages);
    logger.debug('ImagesFormProvider', 'Removed image', imageId);
  }, [form, getImages]);

  const updateMetadata = useCallback((imageId: string, metadata: Partial<ImageMetadata>) => {
    const images = getImages();
    const updatedImages = images.map(img => 
      img.id === imageId ? { ...img, ...metadata } : img
    );
    form.setValue(FORM_KEY, updatedImages);
    logger.debug('ImagesFormProvider', 'Updated image metadata', imageId, metadata);
  }, [form, getImages]);

  const validate = useCallback((): boolean => {
    const images = getImages();
    
    // Check if any images are required
    if (images.length === 0) {
      logger.warn('ImagesFormProvider', 'No images added');
      return false;
    }

    // Check for failed images
    const failedImages = images.filter(img => img.uploadStatus === 'failed');
    if (failedImages.length > 0) {
      logger.warn('ImagesFormProvider', 'Some images failed validation or upload', failedImages);
      return false;
    }

    // Check for required metadata
    const imagesWithoutMetadata = images.filter(img => 
      !img.description || !img.author || !img.license
    );
    if (imagesWithoutMetadata.length > 0) {
      logger.warn('ImagesFormProvider', 'Some images missing required metadata', imagesWithoutMetadata);
      return false;
    }

    return true;
  }, [getImages]);

  const getProgress = useCallback(() => {
    const images = getImages();
    const total = images.length;
    const completed = images.filter(img => img.uploadStatus === 'completed').length;
    const failed = images.filter(img => img.uploadStatus === 'failed').length;
    
    return { total, completed, failed };
  }, [getImages]);

  const clear = useCallback(() => {
    const images = getImages();
    
    // Clean up object URLs
    images.forEach(img => {
      if (img.url && img.url.startsWith('blob:')) {
        URL.revokeObjectURL(img.url);
      }
    });

    form.setValue(FORM_KEY, []);
    logger.debug('ImagesFormProvider', 'Cleared all images');
  }, [form, getImages]);

  // Clean up object URLs on unmount
  useEffect(() => {
    return () => {
      const images = getImages();
      images.forEach(img => {
        if (img.url && img.url.startsWith('blob:')) {
          URL.revokeObjectURL(img.url);
        }
      });
    };
  }, [getImages]);

  const value: ImagesFormContextType = {
    getImages,
    add,
    remove,
    updateMetadata,
    validate,
    getProgress,
    clear
  };

  return (
    <ImagesFormContext.Provider value={value}>
      {children}
    </ImagesFormContext.Provider>
  );
}

// Helper function to validate images
function validateImage(image: ImageMetadata, config?: ImagesFormProviderProps['config']): string | null {
  if (!config?.validationRules) return null;

  for (const rule of config.validationRules) {
    switch (rule.type) {
      case 'file-type':
        if (rule.allowed && !rule.allowed.includes(image.type)) {
          return `File type ${image.type} not allowed. Allowed types: ${rule.allowed.join(', ')}`;
        }
        break;
      
      case 'file-size':
        if (rule.maxSize && image.size > rule.maxSize) {
          return `File size ${Math.round(image.size / 1024 / 1024)}MB exceeds maximum of ${Math.round(rule.maxSize / 1024 / 1024)}MB`;
        }
        break;
      
      case 'min-resolution':
        // Would need to load image to check resolution
        // This is a placeholder for now
        break;
      
      case 'max-resolution':
        // Would need to load image to check resolution
        // This is a placeholder for now
        break;
    }
  }

  return null;
}