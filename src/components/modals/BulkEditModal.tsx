'use client';

import { X, Edit3, Users } from 'lucide-react';
import { ImageFile } from '@/types';
import BulkEditForm from '../forms/BulkEditForm';

interface BulkEditModalProps {
  images: ImageFile[];
  isOpen: boolean;
  onClose: () => void;
  onBulkUpdate: (updates: Partial<ImageFile['metadata']>) => void;
}

export default function BulkEditModal({ images, isOpen, onClose, onBulkUpdate }: BulkEditModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <Users className="w-5 h-5 text-primary" />
            <h2 className="text-xl font-semibold text-card-foreground">
              Bulk Edit Metadata ({images.length} images)
            </h2>
          </div>
          <button
            onClick={onClose}
            className="text-muted-foreground hover:text-foreground"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-muted-foreground mb-6">
            Select the fields you want to update across all images. Only checked fields will be modified.
          </p>

          <BulkEditForm
            images={images}
            onBulkUpdate={onBulkUpdate}
            onClose={onClose}
          />

          <div className="mt-6 p-4 bg-warning/10 rounded-lg">
            <h4 className="font-medium text-warning mb-2">
              <Edit3 className="w-4 h-4 inline mr-1" />
              Bulk Edit Warning
            </h4>
            <p className="text-sm text-warning">
              This will update the selected fields for <strong>all {images.length} images</strong>. 
              Individual descriptions will not be affected. You can still edit individual images afterwards.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}