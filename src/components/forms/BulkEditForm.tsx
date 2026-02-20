'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageFile } from '@/types';
import ArtistSelector from '../selectors/ArtistSelector';
import FieldSelector from './FieldSelector';
import { MusicArtist } from '@/types/music';

const bulkEditSchema = z.object({
  author: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  source: z.string().optional(),
  license: z.string().optional(),
  selectedBand: z.string().optional(),
  selectedFields: z.array(z.string()).default([]),
});

type BulkEditFormData = z.infer<typeof bulkEditSchema>;

interface BulkEditFormProps {
  images: ImageFile[];
  onBulkUpdate: (updates: Partial<ImageFile['metadata']>) => void;
  onClose: () => void;
}

const LICENSE_OPTIONS = [
  { value: 'CC-BY-SA-4.0', label: 'CC BY-SA 4.0' },
  { value: 'CC-BY-4.0', label: 'CC BY 4.0' },
  { value: 'CC-BY-SA-3.0', label: 'CC BY-SA 3.0' },
  { value: 'CC-BY-3.0', label: 'CC BY 3.0' },
  { value: 'CC0', label: 'CC0 (Public Domain)' }
];

export default function BulkEditForm({ images, onBulkUpdate, onClose }: BulkEditFormProps) {
  const { control, watch, setValue, getValues, reset } = useForm<BulkEditFormData>({
    resolver: zodResolver(bulkEditSchema) as any,
    defaultValues: {
      author: '',
      date: '',
      time: '',
      source: '',
      license: '',
      selectedBand: '',
      selectedFields: [],
    },
    mode: 'onChange'
  });

  const watchedData = watch();
  const selectedFields = new Set(watchedData.selectedFields || []);

  const handleFieldToggle = (field: string) => {
    const currentFields = watchedData.selectedFields || [];
    const newFields = currentFields.includes(field)
      ? currentFields.filter(f => f !== field)
      : [...currentFields, field];
    
    setValue('selectedFields', newFields);
    
    // Clear field value if unchecked
    if (!newFields.includes(field)) {
      setValue(field as keyof BulkEditFormData, '');
    }
  };

  const handleUpdateChange = (field: keyof BulkEditFormData, value: string) => {
    setValue(field, value);
  };

  const handleApply = () => {
    const currentValues = getValues();
    const filteredUpdates: Partial<ImageFile['metadata']> = {};
    
    currentValues.selectedFields?.forEach(field => {
      const value = currentValues[field as keyof BulkEditFormData];
      if (value !== undefined && value !== '') {
        (filteredUpdates as Record<string, string | string[]>)[field] = value;
      }
    });
    
    onBulkUpdate(filteredUpdates);
    onClose();
    handleReset();
  };

  const handleReset = () => {
    reset();
  };

  return (
    <div className="space-y-6">
      <FieldSelector
        fieldId="author"
        fieldName="Author"
        description="Author information (use [[User:Username|Full Name]] format for wiki users)"
        isSelected={selectedFields.has('author')}
        onToggle={handleFieldToggle}
      >
        <Controller
          name="author"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleUpdateChange('author', e.target.value);
              }}
              placeholder="[[User:YourUsername|Your Full Name]] or Your Full Name"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            />
          )}
        />
      </FieldSelector>

      <FieldSelector
        fieldId="date"
        fieldName="Date"
        description="When the photos were taken"
        isSelected={selectedFields.has('date')}
        onToggle={handleFieldToggle}
      >
        <Controller
          name="date"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="date"
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleUpdateChange('date', e.target.value);
              }}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            />
          )}
        />
      </FieldSelector>

      <FieldSelector
        fieldId="time"
        fieldName="Time"
        description="Time when photos were taken"
        isSelected={selectedFields.has('time')}
        onToggle={handleFieldToggle}
      >
        <Controller
          name="time"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="time"
              step="1"
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleUpdateChange('time', e.target.value);
              }}
              placeholder="HH:MM:SS"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            />
          )}
        />
      </FieldSelector>

      <FieldSelector
        fieldId="source"
        fieldName="Source"
        description="Origin of the images"
        isSelected={selectedFields.has('source')}
        onToggle={handleFieldToggle}
      >
        <Controller
          name="source"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleUpdateChange('source', e.target.value);
              }}
              placeholder="own work"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            />
          )}
        />
      </FieldSelector>

      <FieldSelector
        fieldId="license"
        fieldName="License"
        description="Copyright license for all images"
        isSelected={selectedFields.has('license')}
        onToggle={handleFieldToggle}
      >
        <Controller
          name="license"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleUpdateChange('license', e.target.value);
              }}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            >
              <option value="">Select license...</option>
              {LICENSE_OPTIONS.map(license => (
                <option key={license.value} value={license.value}>
                  {license.label}
                </option>
              ))}
            </select>
          )}
        />
      </FieldSelector>

      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          id="selectedBand"
          checked={selectedFields.has('selectedBand')}
          onChange={() => handleFieldToggle('selectedBand')}
          className="w-4 h-4 text-primary rounded focus:ring-primary mt-1"
        />
        <label htmlFor="selectedBand" className="flex-1">
          <div className="font-medium text-card-foreground">Band/Artist</div>
          <div className="text-sm text-muted-foreground">Band or artist for music events</div>
        </label>
        {selectedFields.has('selectedBand') && (
          <div className="w-64">
            <ArtistSelector
              onArtistSelect={(artist) => {
                setValue('selectedBand', artist.name);
                handleUpdateChange('selectedBand', artist.name);
              }}
              selectedArtist={{ id: 'empty', name: watchedData.selectedBand || '' } as MusicArtist}
              placeholder="Search for band/artist..."
              label=""
              type="band"
            />
          </div>
        )}
      </div>

      <div className="flex justify-between space-x-3 pt-4">
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
  );
}