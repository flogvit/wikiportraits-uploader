'use client';

import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEffect, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';
import { ImageFile } from '@/types';
import { MusicEventMetadata, BandMember } from '@/types/music';
import { updateImageWikitext, regenerateImageWikitext } from '@/utils/commons-template';
import { extractCategoriesFromWikitext } from '@/utils/category-extractor';
import CommonsPreview from '../image/CommonsPreview';
import CategoryForm from './CategoryForm';
import ImageBandMemberTagger from '../image/ImageBandMemberTagger';

const metadataSchema = z.object({
  description: z.string().optional(),
  authorUsername: z.string().optional(),
  authorFullName: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  source: z.string().optional(),
  license: z.string().optional(),
  selectedBand: z.string().optional(),
  template: z.string().optional(),
  wikitext: z.string().optional(),
  categories: z.array(z.string()).optional(),
  dateFromExif: z.boolean().optional(),
  templateModified: z.boolean().optional(),
  wikitextModified: z.boolean().optional(),
});

type MetadataFormData = z.infer<typeof metadataSchema>;

interface ImageMetadataFormProps {
  image: ImageFile;
  index: number;
  onUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  musicEventData?: MusicEventMetadata;
}

const LICENSE_OPTIONS = [
  { value: 'CC-BY-SA-4.0', label: 'CC BY-SA 4.0' },
  { value: 'CC-BY-4.0', label: 'CC BY 4.0' },
  { value: 'CC-BY-SA-3.0', label: 'CC BY-SA 3.0' },
  { value: 'CC-BY-3.0', label: 'CC BY 3.0' },
  { value: 'CC0', label: 'CC0 (Public Domain)' }
];

export default function ImageMetadataForm({ 
  image, 
  index, 
  onUpdate, 
  musicEventData 
}: ImageMetadataFormProps) {
  const defaultValues = useMemo(() => ({
    description: image.metadata.description || '',
    authorUsername: '',
    authorFullName: '',
    author: image.metadata.author || '',
    date: image.metadata.date || '',
    time: image.metadata.time || '',
    source: image.metadata.source || '',
    license: image.metadata.license || 'CC-BY-SA-4.0',
    selectedBand: image.metadata.selectedBand || '',
    template: image.metadata.template || '',
    wikitext: image.metadata.wikitext || '',
    categories: image.metadata.categories || [],
    dateFromExif: image.metadata.dateFromExif || false,
    templateModified: image.metadata.templateModified || false,
    wikitextModified: image.metadata.wikitextModified || false,
  }), [image.metadata]);

  const { control, watch, setValue, getValues } = useForm<MetadataFormData>({
    resolver: zodResolver(metadataSchema),
    defaultValues,
    mode: 'onChange'
  });

  const watchedData = watch();

  // Update form when image prop changes
  useEffect(() => {
    Object.entries(defaultValues).forEach(([key, value]) => {
      setValue(key as keyof MetadataFormData, value);
    });
  }, [defaultValues, setValue]);

  // Handle metadata changes with automatic wikitext regeneration
  const handleMetadataChange = (field: keyof MetadataFormData, value: string | string[] | boolean) => {
    setValue(field, value);
    
    // Update the metadata immediately
    onUpdate(image.id, { [field]: value });
    
    // If wikitext hasn't been manually modified, regenerate it automatically
    if (!watchedData.wikitextModified) {
      const wikitextFields = ['description', 'author', 'date', 'time', 'source', 'license', 'categories', 'selectedBand', 'template'];
      if (wikitextFields.includes(field as string)) {
        // Regenerate wikitext after a short delay
        setTimeout(() => {
          const currentValues = getValues();
          const updatedImage = { ...image, metadata: { ...image.metadata, ...currentValues, [field]: value } };
          const newWikitext = regenerateImageWikitext(updatedImage);
          setValue('wikitext', newWikitext.metadata.wikitext || '');
          onUpdate(image.id, { wikitext: newWikitext.metadata.wikitext, wikitextModified: false });
        }, 100);
      }
    }
  };

  const handleAuthorChange = (field: 'authorUsername' | 'authorFullName', value: string) => {
    setValue(field, value);
    
    const currentValues = getValues();
    const username = field === 'authorUsername' ? value : currentValues.authorUsername;
    const fullName = field === 'authorFullName' ? value : currentValues.authorFullName;
    
    let formattedAuthor = '';
    if (username && fullName) {
      formattedAuthor = `[[User:${username}|${fullName}]]`;
    } else if (fullName) {
      formattedAuthor = fullName;
    } else if (username) {
      formattedAuthor = `[[User:${username}]]`;
    }
    
    setValue('author', formattedAuthor);
    onUpdate(image.id, { [field]: value, author: formattedAuthor });
    
    // Trigger wikitext regeneration if not manually modified
    if (!watchedData.wikitextModified) {
      setTimeout(() => {
        const updatedImage = { ...image, metadata: { ...image.metadata, [field]: value, author: formattedAuthor } };
        const newWikitext = regenerateImageWikitext(updatedImage);
        setValue('wikitext', newWikitext.metadata.wikitext || '');
        onUpdate(image.id, { wikitext: newWikitext.metadata.wikitext, wikitextModified: false });
      }, 100);
    }
  };

  const handleWikitextChange = (wikitext: string) => {
    setValue('wikitext', wikitext);
    setValue('wikitextModified', true);
    
    const updatedImage = updateImageWikitext(image, wikitext, true);
    
    // Extract categories from wikitext and sync with metadata
    const wikitextCategories = extractCategoriesFromWikitext(wikitext);
    const existingCategories = new Set(watchedData.categories || []);
    
    // Add any new categories found in wikitext
    wikitextCategories.forEach(cat => {
      if (cat.trim() && !existingCategories.has(cat.trim())) {
        existingCategories.add(cat.trim());
      }
    });
    
    const newCategories = Array.from(existingCategories);
    setValue('categories', newCategories);
    
    // Update both wikitext and categories
    onUpdate(image.id, {
      ...updatedImage.metadata,
      categories: newCategories
    });
  };

  const regenerateWikitext = () => {
    const updatedImage = regenerateImageWikitext(image);
    setValue('wikitext', updatedImage.metadata.wikitext || '');
    setValue('wikitextModified', false);
    onUpdate(image.id, updatedImage.metadata);
  };

  const handleTemplateChange = (template: string) => {
    setValue('template', template);
    setValue('templateModified', true);
    onUpdate(image.id, { template, templateModified: true });
    
    // Auto-regenerate wikitext if it hasn't been manually modified
    if (!watchedData.wikitextModified) {
      setTimeout(() => {
        const currentValues = getValues();
        const updatedImage = { ...image, metadata: { ...image.metadata, ...currentValues, template, templateModified: true } };
        const newWikitext = regenerateImageWikitext(updatedImage);
        setValue('wikitext', newWikitext.metadata.wikitext || '');
        onUpdate(image.id, { wikitext: newWikitext.metadata.wikitext, wikitextModified: false });
      }, 100);
    }
  };

  const handleCategoriesChange = (categories: string[]) => {
    setValue('categories', categories);
    handleMetadataChange('categories', categories);
  };

  const handleBandMembersChange = (imageId: string, memberIds: string[]) => {
    onUpdate(imageId, { selectedBandMembers: memberIds });
  };

  // Get available band members from music event data
  const availableMembers: BandMember[] = useMemo(() => {
    if (musicEventData?.eventType === 'festival' && musicEventData.festivalData?.selectedBands) {
      return musicEventData.festivalData.selectedBands.flatMap(band => band.members || []);
    }
    if (musicEventData?.eventType === 'concert' && musicEventData.concertData?.concert.artist) {
      // For concerts, we might need to fetch members of the main artist if it's a band
      // For now, return empty array - this can be expanded later
      return [];
    }
    return [];
  }, [musicEventData]);

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          Description *
        </label>
        <Controller
          name="description"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleMetadataChange('description', e.target.value);
              }}
              placeholder="Describe the portrait (e.g., 'Portrait of John Doe at WikiConference 2025')"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              rows={2}
            />
          )}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Username
          </label>
          <Controller
            name="authorUsername"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  handleAuthorChange('authorUsername', e.target.value);
                }}
                placeholder="YourUsername"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              />
            )}
          />
        </div>
        
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Full Name
          </label>
          <Controller
            name="authorFullName"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  handleAuthorChange('authorFullName', e.target.value);
                }}
                placeholder="Your Full Name"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              />
            )}
          />
        </div>
      </div>
    
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Date {watchedData.dateFromExif && <span className="text-xs text-green-600">(from EXIF)</span>}
            </label>
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
                    handleMetadataChange('date', e.target.value);
                    handleMetadataChange('dateFromExif', false);
                  }}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              )}
            />
            {watchedData.dateFromExif && (
              <p className="text-xs text-green-600 mt-1">
                📷 From EXIF data
              </p>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-card-foreground mb-1">
              Time {watchedData.dateFromExif && watchedData.time && <span className="text-xs text-green-600">(from EXIF)</span>}
            </label>
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
                    handleMetadataChange('time', e.target.value);
                    if (watchedData.dateFromExif) {
                      handleMetadataChange('dateFromExif', false);
                    }
                  }}
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                  placeholder="HH:MM:SS"
                />
              )}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Source
          </label>
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
                  handleMetadataChange('source', e.target.value);
                }}
                placeholder="own work"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              />
            )}
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          License
        </label>
        <Controller
          name="license"
          control={control}
          render={({ field }) => (
            <select
              {...field}
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleMetadataChange('license', e.target.value);
              }}
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            >
              {LICENSE_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          )}
        />
      </div>

      {musicEventData?.eventType === 'festival' && (
        <div>
          <label className="block text-sm font-medium text-card-foreground mb-1">
            Band/Artist
          </label>
          <Controller
            name="selectedBand"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  handleMetadataChange('selectedBand', e.target.value);
                }}
                placeholder="Band or artist name"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              />
            )}
          />
        </div>
      )}

      <CategoryForm
        categories={watchedData.categories || []}
        onCategoriesChange={handleCategoriesChange}
      />

      {/* Band Members Tagger */}
      {availableMembers.length > 0 && (
        <div className="pt-4 border-t border-border">
          <ImageBandMemberTagger
            image={image}
            availableMembers={availableMembers}
            onMembersChange={handleBandMembersChange}
          />
        </div>
      )}

      {/* Template Editor */}
      <div className="pt-4 border-t border-border">
        <label className="block text-sm font-medium text-card-foreground mb-1">
          WikiPortraits Template
          {watchedData.templateModified && (
            <span className="text-xs text-orange-500 ml-1">(modified)</span>
          )}
        </label>
        <Controller
          name="template"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              type="text"
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleTemplateChange(e.target.value);
              }}
              placeholder="e.g. WikiPortraits Event Name (leave empty for no template)"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card font-mono text-sm"
            />
          )}
        />
        <p className="text-xs text-muted-foreground mt-1">
          The template to include in the wikitext (without curly braces). Leave empty to remove template.
        </p>
      </div>

      {/* Wikitext Editor */}
      <div className="pt-4 border-t border-border">
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-card-foreground">
            Commons Wikitext
            {watchedData.wikitextModified && (
              <span className="text-xs text-orange-500 ml-1">(modified)</span>
            )}
          </label>
          <button
            onClick={regenerateWikitext}
            className="flex items-center space-x-1 text-xs text-primary hover:text-primary/80"
            title="Regenerate wikitext from current metadata"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Regenerate</span>
          </button>
        </div>
        <Controller
          name="wikitext"
          control={control}
          render={({ field }) => (
            <textarea
              {...field}
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleWikitextChange(e.target.value);
              }}
              className="w-full h-32 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card font-mono text-sm resize-y"
              placeholder="Wikitext will be generated automatically..."
            />
          )}
        />
        <p className="text-xs text-muted-foreground mt-1">
          This is the complete wikitext that will be used for the Commons file page. You can edit it directly.
        </p>
      </div>

      <div className="pt-4 border-t border-border">
        <CommonsPreview image={image} index={index} />
      </div>
    </div>
  );
}