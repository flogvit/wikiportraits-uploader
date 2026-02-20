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
import CaptionEditor from './CaptionEditor';
import CommonsPreview from '../image/CommonsPreview';
import CategoryForm from './CategoryForm';
import CompactPerformerSelector from '../image/CompactPerformerSelector';
import { logger } from '@/utils/logger';

const metadataSchema = z.object({
  description: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  time: z.string().optional(),
  source: z.string().optional(),
  license: z.string().optional(),
  permission: z.string().optional(),
  selectedBand: z.string().optional(),
  template: z.string().optional(),
  wikitext: z.string().optional(),
  categories: z.array(z.string()).optional(),
  captions: z.array(z.object({
    language: z.string().min(1),
    text: z.string().min(1)
  })).optional(),
  dateFromExif: z.boolean().optional(),
  templateModified: z.boolean().optional(),
  wikitextModified: z.boolean().optional(),
});

type MetadataFormData = z.infer<typeof metadataSchema>;

interface ImageMetadataFormProps {
  image: ImageFile;
  index: number;
  onUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  eventDetails?: any;
  bandPerformers?: any;
  musicEventData?: MusicEventMetadata; // Keep for backward compatibility
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
  eventDetails,
  bandPerformers,
  musicEventData
}: ImageMetadataFormProps) {
  const defaultValues = useMemo(() => ({
    description: image.metadata?.description || '',
    author: image.metadata?.author || '',
    date: image.metadata?.date || '',
    time: image.metadata?.time || '',
    source: image.metadata?.source || '',
    license: image.metadata?.license || 'CC-BY-SA-4.0',
    permission: image.metadata?.permission || '',
    selectedBand: image.metadata?.selectedBand || '',
    template: image.metadata?.template || '',
    wikitext: image.metadata?.wikitext || '',
    categories: image.metadata?.categories || [],
    captions: image.metadata?.captions || [],
    dateFromExif: image.metadata?.dateFromExif || false,
    templateModified: image.metadata?.templateModified || false,
    wikitextModified: image.metadata?.wikitextModified || false,
  }), [image.metadata]);

  const { control, watch, setValue, getValues } = useForm<MetadataFormData>({
    resolver: zodResolver(metadataSchema),
    defaultValues,
    mode: 'onChange'
  });

  // Watch selected band
  const selectedBandValue = watch('selectedBand');

  // Auto-populate categories ONLY on first load if empty
  useEffect(() => {
    const currentCategories = image.metadata?.categories || [];

    // Only auto-populate if categories are empty (first time)
    if (currentCategories.length === 0 && eventDetails?.title) {
      // Generate event categories with selected band
      import('@/utils/music-categories').then(({ generateImageCategories }) => {
        const eventCategories = generateImageCategories(eventDetails, selectedBandValue);

        if (eventCategories.length > 0) {
          setValue('categories', eventCategories);
          onUpdate(image.id, { categories: eventCategories });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount

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

    // Always regenerate wikitext from centralized metadata if not manually modified
    if (!watchedData.wikitextModified) {
      // Regenerate wikitext after a short delay to allow all updates to settle
      setTimeout(() => {
        const currentValues = getValues();
        const updatedImage = { ...image, metadata: { ...image.metadata, ...currentValues, [field]: value } } as ImageFile;
        const regenerated = regenerateImageWikitext(updatedImage);
        setValue('wikitext', regenerated.metadata.wikitext || '');
        onUpdate(image.id, { wikitext: regenerated.metadata.wikitext, wikitextModified: false });
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
        const updatedImage = { ...image, metadata: { ...image.metadata, ...currentValues, template, templateModified: true } } as ImageFile;
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

  const handleBandMembersChange = async (imageId: string, memberIds: string[]) => {
    // Update selectedBandMembers - central data will handle category updates automatically
    // Just update the selected members, description, and filename here
    try {
      const { generateCommonsFilename } = await import('@/utils/commons-filename');
      const { generateMusicEventDescription } = await import('@/utils/commons-description');

      // Get selected performers from the correct data structure
      const selectedPerformers = bandPerformers?.performers?.filter((p: any) => {
        const performerId = p.entity?.id || p.id;
        return memberIds.includes(performerId);
      }) || [];

      // Build form data with updated performers
      const bandOrganization = bandPerformers?.selectedBand ? [{
        entity: {
          id: bandPerformers.selectedBand.id,
          labels: {
            en: {
              language: 'en' as const,
              value: bandPerformers.selectedBand.name
            }
          }
        },
        roles: ['band'],
        isNew: false,
        metadata: {}
      }] : [];

      const formData = {
        workflowType: 'music-event',
        eventDetails: {
          ...eventDetails,
          date: image.metadata?.date || eventDetails?.date
        },
        entities: {
          people: selectedPerformers,
          organizations: bandOrganization,
          locations: [],
          events: []
        }
      };

      // Regenerate description
      const newDescription = generateMusicEventDescription(formData as any);

      // Note: Categories are now managed by central data in ImagesPane
      // When selectedBandMembers changes, ImagesPane automatically fetches
      // performer categories from Wikidata and updates the image metadata

      const updates: any = {
        selectedBandMembers: memberIds,
        description: newDescription
      };

      // Only regenerate filename for NEW images (not existing Commons images)
      if (!(image as any).isExisting && image.file) {
        const newFilename = await generateCommonsFilename(image.file.name, formData as any, index);
        updates.suggestedFilename = newFilename;
      }

      // Update form values
      (setValue as any)('selectedBandMembers', memberIds);
      setValue('description', newDescription);

      // Update metadata in parent - this will trigger category update in ImagesPane
      onUpdate(imageId, updates);

      // Regenerate wikitext with ALL updated metadata if not manually modified
      // Categories will be added by the central data update
      if (!watchedData.wikitextModified) {
        setTimeout(() => {
          // Build updated image with ALL new metadata
          const updatedImage = {
            ...image,
            metadata: {
              ...image.metadata,
              ...updates,
              description: newDescription,
              selectedBandMembers: memberIds
            }
          };
          const regenerated = regenerateImageWikitext(updatedImage);
          setValue('wikitext', regenerated.metadata.wikitext || '');
          onUpdate(imageId, { wikitext: regenerated.metadata.wikitext, wikitextModified: false });
        }, 100);
      }

    } catch (error) {
      logger.error('ImageMetadataForm', 'Failed to regenerate metadata', error);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          Description (English) *
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

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          Author *
        </label>
        <Controller
          name="author"
          control={control}
          render={({ field }) => (
            <input
              {...field}
              value={field.value || ''}
              onChange={(e) => {
                field.onChange(e.target.value);
                handleMetadataChange('author', e.target.value);
              }}
              placeholder="[[User:YourUsername|Your Full Name]] or Your Full Name"
              className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
            />
          )}
        />
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
                  value={field.value ? field.value.substring(0, 10) : ''}
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

      <div>
        <label className="block text-sm font-medium text-card-foreground mb-1">
          Permission (optional)
        </label>
        <Controller
          name="permission"
          control={control}
          render={({ field }) => (
            <div className="space-y-2">
              <textarea
                {...field}
                value={field.value || ''}
                onChange={(e) => {
                  field.onChange(e.target.value);
                  const permissionValue = e.target.value;

                  // Mark as override if changed
                  handleMetadataChange('permission', permissionValue);
                  handleMetadataChange('permissionOverride' as any, permissionValue);

                  // Update wikitext
                  const currentWikitext = getValues('wikitext') || '';
                  if (currentWikitext) {
                    const updatedWikitext = currentWikitext.replace(
                      /\|permission=([^\n]*)/,
                      `|permission=${permissionValue}`
                    );
                    setValue('wikitext', updatedWikitext);
                    handleMetadataChange('wikitext', updatedWikitext);
                    handleMetadataChange('wikitextModified', true);
                  }
                }}
                rows={2}
                placeholder="e.g., Permission granted by performers via messenger on May 24, 2025. Available upon request."
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card text-sm resize-y"
              />
              <p className="text-xs text-muted-foreground">
                Plain text describing how you obtained permission. This will be visible on the Commons page.
              </p>
            </div>
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


      <CaptionEditor
        captions={(watchedData.captions || []) as any}
        onUpdate={(captions) => {
          setValue('captions', captions as any);
          onUpdate(image.id, { captions });
        }}
        suggestedCaptions={(() => {
          const { generateMultilingualCaptions } = require('@/utils/caption-generator');

          // Use image.metadata directly, not watchedData (which might be stale)
          const taggedMemberIds = image.metadata?.selectedBandMembers || [];

          // EXACT copy from ImageCard lines 128-162
          const selectedPerformersRaw = bandPerformers?.performers?.filter((p: any) => {
            const performerId = p.entity?.id || p.id;
            return taggedMemberIds.includes(performerId);
          }) || [];

          const selectedPerformers = selectedPerformersRaw.map((p: any) => {
            const performerName =
              p.entity?.labels?.en?.value ||
              p.entity?.labels?.en ||
              p.labels?.en?.value ||
              p.labels?.en ||
              p.name ||
              p.entity?.id ||
              p.id ||
              'Unknown';

            return {
              entity: {
                id: p.entity?.id || p.id,
                labels: {
                  en: {
                    language: 'en' as const,
                    value: performerName
                  }
                }
              },
              roles: p.roles || [],
              isNew: p.isNew || false,
              metadata: p.metadata || {}
            };
          });

          // EXACT copy from ImageCard lines 174-184
          const bandOrganization = bandPerformers?.selectedBand ? [{
            entity: {
              id: bandPerformers.selectedBand.id,
              labels: {
                en: {
                  language: 'en' as const,
                  value: bandPerformers.selectedBand.name
                }
              }
            }
          }] : [];

          // EXACT copy from ImageCard lines 186-198
          const formData = {
            workflowType: 'music-event',
            eventDetails: {
              ...eventDetails,
              date: image.metadata?.date || eventDetails?.date
            },
            entities: {
              people: selectedPerformers,
              organizations: bandOrganization,
              locations: [],
              events: []
            }
          };

          return generateMultilingualCaptions(formData as any, eventDetails?.location, eventDetails?.date);
        })()}
      />

      <CategoryForm
        categories={watchedData.categories || []}
        onCategoriesChange={(cats) => {
          handleCategoriesChange(cats);
        }}
      />

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
              placeholder={field.value ? "" : "Wikitext will be generated automatically..."}
            />
          )}
        />
        <p className="text-xs text-muted-foreground mt-1">
          This is the complete wikitext that will be used for the Commons file page. You can edit it directly.
        </p>
      </div>

      <div className="pt-4 border-t border-border">
        <CommonsPreview image={image} index={index} musicEventData={musicEventData} />
      </div>
    </div>
  );
}