'use client';

import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useFormContext } from 'react-hook-form';

interface UploadItem {
  id: string;
  type: 'image' | 'template' | 'entity' | 'category';
  name: string;
  status: 'pending' | 'uploading' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  error?: string;
  result?: any;
  metadata?: Record<string, any>;
}

interface UploadStats {
  total: number;
  pending: number;
  uploading: number;
  completed: number;
  failed: number;
  cancelled: number;
}

interface UploadFormContextType {
  getQueue: () => UploadItem[];
  start: () => Promise<void>;
  pause: () => void;
  cancel: (itemId?: string) => void;
  retry: (itemId: string) => void;
  getProgress: () => UploadStats;
  getErrors: () => UploadItem[];
  getStatus: () => 'idle' | 'uploading' | 'paused' | 'completed' | 'failed';
  clear: () => void;
}

const UploadFormContext = createContext<UploadFormContextType | undefined>(undefined);

export function useUploadForm(): UploadFormContextType {
  const context = useContext(UploadFormContext);
  if (!context) {
    throw new Error('useUploadForm must be used within an UploadFormProvider');
  }
  return context;
}

interface UploadFormProviderProps {
  children: React.ReactNode;
  config?: {
    maxConcurrent?: number;
    retryAttempts?: number;
    retryDelay?: number;
    uploadHandlers?: Record<string, (item: UploadItem) => Promise<any>>;
  };
}

export function UploadFormProvider({ children, config }: UploadFormProviderProps) {
  const form = useFormContext();
  const FORM_KEY = 'upload';
  const STATUS_KEY = 'uploadStatus';

  // Initialize upload state if not present
  useEffect(() => {
    if (!form.getValues(FORM_KEY)) {
      form.setValue(FORM_KEY, []);
    }
    if (!form.getValues(STATUS_KEY)) {
      form.setValue(STATUS_KEY, 'idle');
    }
  }, [form]);

  const getQueue = useCallback((): UploadItem[] => {
    return form.getValues(FORM_KEY) || [];
  }, [form]);

  const updateQueue = useCallback((updater: (queue: UploadItem[]) => UploadItem[]) => {
    const currentQueue = getQueue();
    const newQueue = updater(currentQueue);
    form.setValue(FORM_KEY, newQueue);
  }, [form, getQueue]);

  const buildUploadQueue = useCallback((): UploadItem[] => {
    const queue: UploadItem[] = [];
    
    // Add images to queue
    const images = form.getValues('images') || [];
    images.forEach((image: any) => {
      if (image.uploadStatus !== 'completed') {
        queue.push({
          id: `img_${image.id}`,
          type: 'image',
          name: image.filename,
          status: 'pending',
          progress: 0,
          metadata: { imageId: image.id }
        });
      }
    });

    // Add templates to queue
    const templates = form.getValues('templates') || [];
    templates.forEach((template: any) => {
      queue.push({
        id: `tpl_${template.id}`,
        type: 'template',
        name: template.title,
        status: 'pending',
        progress: 0,
        metadata: { templateId: template.id }
      });
    });

    // Add categories to queue
    const categories = form.getValues('categories') || [];
    categories.forEach((category: any) => {
      queue.push({
        id: `cat_${category.id}`,
        type: 'category',
        name: category.name,
        status: 'pending',
        progress: 0,
        metadata: { categoryId: category.id }
      });
    });

    // Add entities to queue (for new entities)
    const entities = getAllEntities();
    entities.forEach((entity: any) => {
      if (entity.new) {
        queue.push({
          id: `ent_${entity.id}`,
          type: 'entity',
          name: entity.name,
          status: 'pending',
          progress: 0,
          metadata: { entityId: entity.id }
        });
      }
    });

    return queue;
  }, [form]);

  const start = useCallback(async () => {
    const queue = buildUploadQueue();
    updateQueue(() => queue);
    form.setValue(STATUS_KEY, 'uploading');

    console.log('🚀 Starting upload process with', queue.length, 'items');

    const maxConcurrent = config?.maxConcurrent || 3;
    const activeUploads = new Set<string>();

    const processQueue = async () => {
      const currentQueue = getQueue();
      const pendingItems = currentQueue.filter(item => item.status === 'pending');
      const canStart = Math.min(pendingItems.length, maxConcurrent - activeUploads.size);

      for (let i = 0; i < canStart; i++) {
        const item = pendingItems[i];
        activeUploads.add(item.id);
        
        updateQueue(queue => 
          queue.map(q => q.id === item.id ? { ...q, status: 'uploading' as const } : q)
        );

        uploadItem(item)
          .then(result => {
            updateQueue(queue => 
              queue.map(q => q.id === item.id ? { 
                ...q, 
                status: 'completed' as const, 
                progress: 100,
                result 
              } : q)
            );
            activeUploads.delete(item.id);
            processQueue(); // Continue processing
          })
          .catch(error => {
            updateQueue(queue => 
              queue.map(q => q.id === item.id ? { 
                ...q, 
                status: 'failed' as const, 
                error: error.message 
              } : q)
            );
            activeUploads.delete(item.id);
            processQueue(); // Continue processing
          });
      }

      // Check if all uploads are done
      const finalQueue = getQueue();
      const stillProcessing = finalQueue.some(item => 
        item.status === 'pending' || item.status === 'uploading'
      );

      if (!stillProcessing) {
        const failed = finalQueue.filter(item => item.status === 'failed');
        form.setValue(STATUS_KEY, failed.length > 0 ? 'failed' : 'completed');
        console.log('✅ Upload process completed');
      }
    };

    processQueue();
  }, [buildUploadQueue, updateQueue, form, config, getQueue]);

  const uploadItem = useCallback(async (item: UploadItem): Promise<any> => {
    const handler = config?.uploadHandlers?.[item.type];
    if (!handler) {
      throw new Error(`No upload handler for type: ${item.type}`);
    }

    return handler(item);
  }, [config]);

  const pause = useCallback(() => {
    form.setValue(STATUS_KEY, 'paused');
    console.log('⏸️ Upload process paused');
  }, [form]);

  const cancel = useCallback((itemId?: string) => {
    if (itemId) {
      updateQueue(queue => 
        queue.map(q => q.id === itemId ? { ...q, status: 'cancelled' as const } : q)
      );
      console.log('❌ Cancelled upload:', itemId);
    } else {
      updateQueue(queue => 
        queue.map(q => q.status === 'pending' || q.status === 'uploading' ? 
          { ...q, status: 'cancelled' as const } : q
        )
      );
      form.setValue(STATUS_KEY, 'idle');
      console.log('❌ Cancelled all uploads');
    }
  }, [updateQueue, form]);

  const retry = useCallback((itemId: string) => {
    updateQueue(queue => 
      queue.map(q => q.id === itemId ? { 
        ...q, 
        status: 'pending' as const, 
        progress: 0,
        error: undefined 
      } : q)
    );
    console.log('🔄 Retrying upload:', itemId);
  }, [updateQueue]);

  const getProgress = useCallback((): UploadStats => {
    const queue = getQueue();
    return {
      total: queue.length,
      pending: queue.filter(item => item.status === 'pending').length,
      uploading: queue.filter(item => item.status === 'uploading').length,
      completed: queue.filter(item => item.status === 'completed').length,
      failed: queue.filter(item => item.status === 'failed').length,
      cancelled: queue.filter(item => item.status === 'cancelled').length
    };
  }, [getQueue]);

  const getErrors = useCallback((): UploadItem[] => {
    return getQueue().filter(item => item.status === 'failed');
  }, [getQueue]);

  const getStatus = useCallback(() => {
    return form.getValues(STATUS_KEY) || 'idle';
  }, [form]);

  const clear = useCallback(() => {
    form.setValue(FORM_KEY, []);
    form.setValue(STATUS_KEY, 'idle');
    console.log('🧹 Cleared upload queue');
  }, [form]);

  // Helper function to get all entities from form data
  const getAllEntities = useCallback(() => {
    const entities: any[] = [];
    
    // Get entities from all domain-specific forms
    const musicDetails = form.getValues('musicDetails') || {};
    const soccerDetails = form.getValues('soccerDetails') || {};
    const organizationDetails = form.getValues('organizationDetails') || {};
    
    // Extract entities from each domain
    [musicDetails, soccerDetails, organizationDetails].forEach(details => {
      Object.values(details).forEach(value => {
        if (Array.isArray(value)) {
          entities.push(...value.filter(item => item && item.id));
        } else if (value && typeof value === 'object' && value.id) {
          entities.push(value);
        }
      });
    });

    return entities;
  }, [form]);

  const value: UploadFormContextType = {
    getQueue,
    start,
    pause,
    cancel,
    retry,
    getProgress,
    getErrors,
    getStatus,
    clear
  };

  return (
    <UploadFormContext.Provider value={value}>
      {children}
    </UploadFormContext.Provider>
  );
}