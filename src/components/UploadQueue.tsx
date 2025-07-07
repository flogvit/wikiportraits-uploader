'use client';

import { useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Clock, Download, Edit3, ChevronDown, ChevronUp } from 'lucide-react';
import { ImageFile } from '@/app/page';

interface UploadQueueProps {
  images: ImageFile[];
  onExportMetadata: () => void;
  onBulkEdit: () => void;
  onScrollToImage?: (imageId: string) => void;
}

export interface UploadStatus {
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export default function UploadQueue({ images, onExportMetadata, onBulkEdit, onScrollToImage }: UploadQueueProps) {
  const [uploadStatuses, setUploadStatuses] = useState<UploadStatus[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [showIncompleteDetails, setShowIncompleteDetails] = useState(false);

  const readyImages = images.filter(img => {
    const { description, author, wikiPortraitsEvent } = img.metadata;
    return description.trim() && author.trim() && wikiPortraitsEvent.trim();
  });

  const incompleteImages = images.filter(img => {
    const { description, author, wikiPortraitsEvent } = img.metadata;
    return !description.trim() || !author.trim() || !wikiPortraitsEvent.trim();
  });

  const simulateUpload = async () => {
    if (readyImages.length === 0) return;

    setIsUploading(true);
    const statuses: UploadStatus[] = readyImages.map(img => ({
      id: img.id,
      status: 'pending' as const,
      progress: 0
    }));
    setUploadStatuses(statuses);

    for (let i = 0; i < readyImages.length; i++) {
      const imageId = readyImages[i].id;
      
      // Update to uploading status
      setUploadStatuses(prev => prev.map(status => 
        status.id === imageId 
          ? { ...status, status: 'uploading' as const }
          : status
      ));

      // Simulate upload progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setUploadStatuses(prev => prev.map(status => 
          status.id === imageId 
            ? { ...status, progress }
            : status
        ));
      }

      // Simulate random success/failure
      const success = Math.random() > 0.1; // 90% success rate
      
      setUploadStatuses(prev => prev.map(status => 
        status.id === imageId 
          ? { 
              ...status, 
              status: success ? 'completed' as const : 'error' as const,
              error: success ? undefined : 'Upload failed - simulated error'
            }
          : status
      ));
    }

    setIsUploading(false);
  };

  const getStatusIcon = (status: UploadStatus) => {
    switch (status.status) {
      case 'pending':
        return <Clock className="w-4 h-4 text-gray-500" />;
      case 'uploading':
        return <Upload className="w-4 h-4 text-blue-500 animate-spin" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'error':
        return <AlertCircle className="w-4 h-4 text-red-500" />;
    }
  };

  const getStatusColor = (status: UploadStatus) => {
    switch (status.status) {
      case 'pending':
        return 'bg-gray-200';
      case 'uploading':
        return 'bg-blue-200';
      case 'completed':
        return 'bg-green-200';
      case 'error':
        return 'bg-red-200';
    }
  };

  if (images.length === 0) {
    return null;
  }

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Upload Queue</h2>
        <div className="flex space-x-3">
          <button
            onClick={onBulkEdit}
            className="flex items-center space-x-2 px-4 py-2 bg-purple-500 text-white rounded-md hover:bg-purple-600 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            <span>Bulk Edit</span>
          </button>
          <button
            onClick={onExportMetadata}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Export Metadata</span>
          </button>
          <button
            onClick={simulateUpload}
            disabled={isUploading || readyImages.length === 0}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Upload className="w-4 h-4" />
            <span>
              {isUploading ? 'Uploading...' : `Upload ${readyImages.length} Images`}
            </span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <h3 className="text-lg font-semibold text-green-700 mb-3">
            Ready to Upload ({readyImages.length})
          </h3>
          <div className="space-y-3 max-h-64 overflow-y-auto">
            {readyImages.map(image => {
              const status = uploadStatuses.find(s => s.id === image.id);
              return (
                <div
                  key={image.id}
                  className={`p-3 rounded-md border ${getStatusColor(status || { status: 'pending', progress: 0, id: image.id })}`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      {status && getStatusIcon(status)}
                      <span className="text-sm font-medium truncate">
                        {image.file.name}
                      </span>
                    </div>
                    {status?.status === 'uploading' && (
                      <span className="text-xs text-gray-600">
                        {status.progress}%
                      </span>
                    )}
                  </div>
                  {status?.status === 'uploading' && (
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${status.progress}%` }}
                      />
                    </div>
                  )}
                  {status?.error && (
                    <p className="text-xs text-red-600 mt-1">{status.error}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        <div>
          <h3 className="text-lg font-semibold text-yellow-700 mb-3">
            Incomplete Metadata ({incompleteImages.length})
          </h3>
          {incompleteImages.length > 0 ? (
            <div className="space-y-4">
              {/* Summary Stats */}
              <div className="p-4 bg-yellow-50 rounded-md border border-yellow-200">
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold text-yellow-700">
                      {incompleteImages.filter(img => !img.metadata.description.trim()).length}
                    </div>
                    <div className="text-xs text-yellow-600">Missing Description</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-700">
                      {incompleteImages.filter(img => !img.metadata.author.trim()).length}
                    </div>
                    <div className="text-xs text-yellow-600">Missing Author</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold text-yellow-700">
                      {incompleteImages.filter(img => !img.metadata.wikiPortraitsEvent.trim()).length}
                    </div>
                    <div className="text-xs text-yellow-600">Missing Event</div>
                  </div>
                </div>
                <div className="mt-3 text-center">
                  <p className="text-sm text-yellow-700">
                    Use <strong>Bulk Edit</strong> to set common fields like Author and Event quickly
                  </p>
                </div>
              </div>

              {/* Expandable view for all incomplete images */}
              <div className="space-y-3">
                <div className="text-center">
                  <button
                    onClick={() => setShowIncompleteDetails(!showIncompleteDetails)}
                    className="flex items-center space-x-2 mx-auto px-3 py-2 text-sm text-yellow-700 hover:text-yellow-800 hover:bg-yellow-50 rounded-md transition-colors"
                  >
                    <span>
                      {showIncompleteDetails ? 'Hide' : 'Show'} incomplete files
                    </span>
                    {showIncompleteDetails ? (
                      <ChevronUp className="w-4 h-4" />
                    ) : (
                      <ChevronDown className="w-4 h-4" />
                    )}
                  </button>
                </div>

                {showIncompleteDetails && (
                  <div className="space-y-2 max-h-60 overflow-y-auto border border-yellow-200 rounded-md p-3 bg-yellow-25">
                    {incompleteImages.map(image => (
                      <button
                        key={image.id}
                        onClick={() => onScrollToImage?.(image.id)}
                        className="w-full p-2 bg-white rounded border border-yellow-100 hover:bg-yellow-50 hover:border-yellow-300 transition-colors cursor-pointer text-left"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-medium truncate text-yellow-800">
                            {image.file.name}
                          </span>
                          <div className="text-xs text-yellow-600">
                            Missing: {[
                              !image.metadata.description.trim() && 'Desc',
                              !image.metadata.author.trim() && 'Author',
                              !image.metadata.wikiPortraitsEvent.trim() && 'Event'
                            ].filter(Boolean).join(', ')}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

            </div>
          ) : (
            <div className="text-center p-4 text-green-600">
              <CheckCircle className="w-8 h-8 mx-auto mb-2" />
              <p className="font-medium">All metadata complete!</p>
            </div>
          )}
        </div>
      </div>

      {uploadStatuses.length > 0 && (
        <div className="mt-6 p-4 bg-gray-50 rounded-md">
          <h4 className="font-medium text-gray-900 mb-2">Upload Summary</h4>
          <div className="grid grid-cols-4 gap-4 text-center">
            <div>
              <div className="text-2xl font-bold text-gray-600">
                {uploadStatuses.filter(s => s.status === 'pending').length}
              </div>
              <div className="text-xs text-gray-500">Pending</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-blue-600">
                {uploadStatuses.filter(s => s.status === 'uploading').length}
              </div>
              <div className="text-xs text-gray-500">Uploading</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-green-600">
                {uploadStatuses.filter(s => s.status === 'completed').length}
              </div>
              <div className="text-xs text-gray-500">Completed</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-red-600">
                {uploadStatuses.filter(s => s.status === 'error').length}
              </div>
              <div className="text-xs text-gray-500">Failed</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}