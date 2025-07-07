'use client';

import { useState } from 'react';
import { X, Edit3, Users } from 'lucide-react';
import { ImageFile } from '@/app/page';

interface BulkEditModalProps {
  images: ImageFile[];
  isOpen: boolean;
  onClose: () => void;
  onBulkUpdate: (updates: Partial<ImageFile['metadata']>) => void;
}

const LICENSE_OPTIONS = [
  { value: 'CC-BY-SA-4.0', label: 'CC BY-SA 4.0' },
  { value: 'CC-BY-4.0', label: 'CC BY 4.0' },
  { value: 'CC-BY-SA-3.0', label: 'CC BY-SA 3.0' },
  { value: 'CC-BY-3.0', label: 'CC BY 3.0' },
  { value: 'CC0', label: 'CC0 (Public Domain)' }
];

const WIKI_PORTRAITS_EVENTS = [
  'WikiConference North America 2025',
  'TED2025',
  'Sundance Film Festival 2025',
  'SXSW 2025',
  'Wikimania 2024',
  'Other'
];

export default function BulkEditModal({ images, isOpen, onClose, onBulkUpdate }: BulkEditModalProps) {
  const [updates, setUpdates] = useState<Partial<ImageFile['metadata']>>({});
  const [selectedFields, setSelectedFields] = useState<Set<string>>(new Set());

  if (!isOpen) return null;

  const handleFieldToggle = (field: string) => {
    const newSelected = new Set(selectedFields);
    if (newSelected.has(field)) {
      newSelected.delete(field);
      const newUpdates = { ...updates };
      delete newUpdates[field as keyof ImageFile['metadata']];
      setUpdates(newUpdates);
    } else {
      newSelected.add(field);
    }
    setSelectedFields(newSelected);
  };

  const handleUpdateChange = (field: keyof ImageFile['metadata'], value: string | string[]) => {
    setUpdates(prev => ({ ...prev, [field]: value }));
  };

  const handleApply = () => {
    const filteredUpdates: Partial<ImageFile['metadata']> = {};
    selectedFields.forEach(field => {
      const value = updates[field as keyof ImageFile['metadata']];
      if (value !== undefined) {
        (filteredUpdates as Record<string, string | string[]>)[field] = value;
      }
    });
    
    onBulkUpdate(filteredUpdates);
    onClose();
    setUpdates({});
    setSelectedFields(new Set());
  };

  const handleReset = () => {
    setUpdates({});
    setSelectedFields(new Set());
  };

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

          <div className="space-y-6">
            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="author"
                checked={selectedFields.has('author')}
                onChange={() => handleFieldToggle('author')}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="author" className="flex-1">
                <div className="font-medium text-card-foreground">Author</div>
                <div className="text-sm text-muted-foreground">Photographer or creator name</div>
              </label>
              {selectedFields.has('author') && (
                <input
                  type="text"
                  value={updates.author || ''}
                  onChange={(e) => handleUpdateChange('author', e.target.value)}
                  placeholder="Enter author name"
                  className="w-64 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="date"
                checked={selectedFields.has('date')}
                onChange={() => handleFieldToggle('date')}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="date" className="flex-1">
                <div className="font-medium text-card-foreground">Date</div>
                <div className="text-sm text-muted-foreground">When the photos were taken</div>
              </label>
              {selectedFields.has('date') && (
                <input
                  type="date"
                  value={updates.date || ''}
                  onChange={(e) => handleUpdateChange('date', e.target.value)}
                  className="w-64 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="source"
                checked={selectedFields.has('source')}
                onChange={() => handleFieldToggle('source')}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="source" className="flex-1">
                <div className="font-medium text-card-foreground">Source</div>
                <div className="text-sm text-muted-foreground">Origin of the images</div>
              </label>
              {selectedFields.has('source') && (
                <input
                  type="text"
                  value={updates.source || ''}
                  onChange={(e) => handleUpdateChange('source', e.target.value)}
                  placeholder="e.g., self-made"
                  className="w-64 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="license"
                checked={selectedFields.has('license')}
                onChange={() => handleFieldToggle('license')}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="license" className="flex-1">
                <div className="font-medium text-card-foreground">License</div>
                <div className="text-sm text-muted-foreground">Copyright license for all images</div>
              </label>
              {selectedFields.has('license') && (
                <select
                  value={updates.license || ''}
                  onChange={(e) => handleUpdateChange('license', e.target.value)}
                  className="w-64 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                >
                  <option value="">Select license...</option>
                  {LICENSE_OPTIONS.map(license => (
                    <option key={license.value} value={license.value}>
                      {license.label}
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="flex items-center space-x-3">
              <input
                type="checkbox"
                id="wikiPortraitsEvent"
                checked={selectedFields.has('wikiPortraitsEvent')}
                onChange={() => handleFieldToggle('wikiPortraitsEvent')}
                className="w-4 h-4 text-primary rounded focus:ring-primary"
              />
              <label htmlFor="wikiPortraitsEvent" className="flex-1">
                <div className="font-medium text-card-foreground">WikiPortraits Event</div>
                <div className="text-sm text-muted-foreground">Event where photos were taken</div>
              </label>
              {selectedFields.has('wikiPortraitsEvent') && (
                <select
                  value={updates.wikiPortraitsEvent || ''}
                  onChange={(e) => handleUpdateChange('wikiPortraitsEvent', e.target.value)}
                  className="w-64 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                >
                  <option value="">Select event...</option>
                  {WIKI_PORTRAITS_EVENTS.map(event => (
                    <option key={event} value={event}>
                      {event}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

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

        <div className="flex justify-between space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleReset}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Reset
          </button>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
            <button
              onClick={handleApply}
              disabled={selectedFields.size === 0}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed transition-colors"
            >
              Apply to {images.length} Images
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}