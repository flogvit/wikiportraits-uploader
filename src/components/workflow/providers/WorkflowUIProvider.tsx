'use client';

import React, { createContext, useContext } from 'react';
import { ImageFile } from '@/types';

interface WorkflowUIActions {
  onExportMetadata: () => void;
  onBulkEdit: () => void;
  onScrollToImage: (imageId: string) => void;
  onImageClick: (image: ImageFile) => void;
}

const WorkflowUIContext = createContext<WorkflowUIActions | null>(null);

export function WorkflowUIProvider({ 
  children, 
  actions 
}: { 
  children: React.ReactNode; 
  actions: WorkflowUIActions;
}) {
  return (
    <WorkflowUIContext.Provider value={actions}>
      {children}
    </WorkflowUIContext.Provider>
  );
}

export function useWorkflowUI(): WorkflowUIActions {
  const context = useContext(WorkflowUIContext);
  if (!context) {
    throw new Error('useWorkflowUI must be used within a WorkflowUIProvider');
  }
  return context;
}