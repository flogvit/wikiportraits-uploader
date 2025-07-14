'use client';

import { AlertTriangle, X, CheckCircle, FileX } from 'lucide-react';
import { DuplicateInfo, getDuplicateMessage } from '@/utils/duplicate-detection';

interface DuplicateWarningModalProps {
  duplicates: DuplicateInfo[];
  isOpen: boolean;
  onClose: () => void;
  onAddAnyway: () => void;
}

export default function DuplicateWarningModal({ 
  duplicates, 
  isOpen, 
  onClose, 
  onAddAnyway 
}: DuplicateWarningModalProps) {
  if (!isOpen || duplicates.length === 0) return null;

  const identicalDuplicates = duplicates.filter(d => d.reason === 'identical');
  const potentialDuplicates = duplicates.filter(d => d.reason !== 'identical');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-card rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b border-border">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="w-6 h-6 text-yellow-500" />
            <h2 className="text-xl font-semibold text-card-foreground">
              Duplicate Files Detected
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
            We found {duplicates.length} file{duplicates.length > 1 ? 's' : ''} that 
            {duplicates.length > 1 ? ' appear' : ' appears'} to be duplicate{duplicates.length > 1 ? 's' : ''} 
            of images you&apos;ve already added.
          </p>

          <div className="space-y-6">
            {/* Identical duplicates */}
            {identicalDuplicates.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <FileX className="w-5 h-5 text-red-500" />
                  <h3 className="font-medium text-red-700">
                    Identical Files ({identicalDuplicates.length})
                  </h3>
                </div>
                <div className="bg-destructive/10 border border-destructive/20 rounded-md p-3">
                  <div className="space-y-2">
                    {identicalDuplicates.map((duplicate, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-destructive">
                          {duplicate.file.name}
                        </span>
                        <span className="text-destructive/80">
                          {getDuplicateMessage(duplicate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Potential duplicates */}
            {potentialDuplicates.length > 0 && (
              <div>
                <div className="flex items-center space-x-2 mb-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-500" />
                  <h3 className="font-medium text-yellow-700">
                    Potential Duplicates ({potentialDuplicates.length})
                  </h3>
                </div>
                <div className="bg-warning/10 border border-warning/20 rounded-md p-3">
                  <div className="space-y-2">
                    {potentialDuplicates.map((duplicate, index) => (
                      <div key={index} className="flex items-center justify-between text-sm">
                        <span className="font-medium text-warning">
                          {duplicate.file.name}
                        </span>
                        <span className="text-warning/80">
                          {getDuplicateMessage(duplicate)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 p-4 bg-primary/10 rounded-lg">
            <h4 className="font-medium text-primary mb-2">Recommendations:</h4>
            <ul className="text-sm text-primary/80 space-y-1">
              <li>• <strong>Identical files:</strong> These are exact duplicates and shouldn&apos;t be added again</li>
              <li>• <strong>Same filename:</strong> May be the same image, check if you already added it</li>
              <li>• <strong>Similar size/type:</strong> Could be the same image with different names</li>
              <li>• <strong>Review your existing images</strong> below before deciding</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-between space-x-3 p-6 border-t border-border bg-muted">
          <button
            onClick={onClose}
            className="flex items-center space-x-2 px-4 py-2 text-muted-foreground hover:text-foreground"
          >
            <CheckCircle className="w-4 h-4" />
            <span>Cancel Upload</span>
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onAddAnyway}
              className="px-6 py-2 bg-yellow-500 text-white rounded-md hover:bg-yellow-600 transition-colors"
            >
              Add Anyway ({duplicates.length} files)
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}