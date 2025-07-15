'use client';

import { createContext, useContext, ReactNode, useState, useEffect } from 'react';
import { useForm, FormProvider, UseFormReturn } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ImageFile } from '@/app/page';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/forms/SoccerMatchForm';
import { MusicEventMetadata } from '@/types/music';
import { UploadType } from '@/components/selectors/UploadTypeSelector';
import { setItem, getItem, KEYS, loadSelectedBandMembers, saveSelectedBandMembers, loadAuthorWikidataQid } from '@/utils/localStorage';

// Individual schemas for each section
const eventDetailsSchema = z.object({
  festivalName: z.string().default(''),
  year: z.string().default(''),
  location: z.string().default(''),
  country: z.string().default(''),
  selectedBand: z.object({
    id: z.string(),
    name: z.string(),
    wikipediaUrl: z.string().optional(),
    wikidataUrl: z.string().optional(),
    musicbrainzId: z.string().optional(),
    country: z.string().optional(),
    entityType: z.string().optional(),
    source: z.string().optional(),
  }).optional(),
  selectedBandMembers: z.array(z.string()).default([]),
  photographerWikidataId: z.string().default(''),
  addToWikiPortraitsConcerts: z.boolean().default(false),
});

const categoriesSchema = z.object({
  selectedCategories: z.array(z.string()).default([]),
  newCategoryName: z.string().default(''),
  categoryInput: z.string().default(''),
});

const templatesSchema = z.object({
  selectedLanguage: z.string().default('en'),
  templateCode: z.string().default(''),
  customTemplateName: z.string().default(''),
});

const uploadSchema = z.object({
  currentStep: z.enum(['template', 'images', 'complete']).default('template'),
  templateCreated: z.boolean().default(false),
  uploadProgress: z.number().min(0).max(100).default(0),
  currentUploadIndex: z.number().min(0).default(0),
  stepStatuses: z.object({
    template: z.enum(['pending', 'in-progress', 'completed', 'error']).default('pending'),
    images: z.enum(['pending', 'in-progress', 'completed', 'error']).default('pending'),
    complete: z.enum(['pending', 'in-progress', 'completed', 'error']).default('pending'),
  }).default({
    template: 'pending',
    images: 'pending',
    complete: 'pending'
  }),
});

const imageMetadataSchema = z.object({
  description: z.string().default(''),
  categories: z.array(z.string()).default([]),
  date: z.string().default(''),
  author: z.string().default(''),
  source: z.string().default(''),
  license: z.string().default(''),
  permission: z.string().default(''),
  otherVersions: z.string().default(''),
  additionalCategories: z.array(z.string()).default([]),
  template: z.string().optional(),
  templateModified: z.boolean().default(false),
});

// Combined workflow schema
const workflowFormSchema = z.object({
  // Upload type and metadata
  uploadType: z.enum(['general', 'soccer', 'music', 'portraits']).default('general'),
  
  // Event details (for music and soccer events)
  eventDetails: eventDetailsSchema,
  
  // Categories management
  categories: categoriesSchema,
  
  // Template generation
  templates: templatesSchema,
  
  // Upload process
  upload: uploadSchema,
  
  // Images metadata (array of image metadata)
  imageMetadata: z.array(imageMetadataSchema).default([]),
  
  // Soccer-specific data
  soccerMatchData: z.any().optional(), // Keep as any for now to avoid complex typing
  selectedPlayers: z.array(z.any()).default([]),
  
  // Music-specific data
  musicEventData: z.any().optional(), // Keep as any for now to avoid complex typing
  
  // Wikidata entity creation
  pendingWikidataEntities: z.array(z.any()).default([]), // Array of PendingWikidataEntity objects
});

export type WorkflowFormData = z.infer<typeof workflowFormSchema>;

// Load data from localStorage
const loadStoredEventDetails = () => {
  const bandId = getItem(KEYS.FESTIVAL_BAND_ID);
  const bandName = getItem(KEYS.FESTIVAL_BAND_NAME);
  const currentBandId = bandId || `pending-band-${bandName}`;
  const photographerWikidataId = loadAuthorWikidataQid();
  
  return {
    festivalName: getItem(KEYS.FESTIVAL_NAME),
    year: getItem(KEYS.FESTIVAL_YEAR),
    location: getItem(KEYS.FESTIVAL_LOCATION),
    country: getItem(KEYS.FESTIVAL_COUNTRY),
    selectedBand: (bandId || bandName) ? {
      id: bandId,
      name: bandName,
      wikipediaUrl: getItem(KEYS.FESTIVAL_BAND_WIKIPEDIA),
      wikidataUrl: getItem(KEYS.FESTIVAL_BAND_WIKIDATA),
      musicbrainzId: getItem(KEYS.FESTIVAL_BAND_MUSICBRAINZ),
      country: getItem(KEYS.FESTIVAL_BAND_COUNTRY),
    } : undefined,
    selectedBandMembers: currentBandId ? loadSelectedBandMembers(currentBandId) : [],
    // Author info is automatically populated from authenticated user's Q-ID
    photographerWikidataId,
    addToWikiPortraitsConcerts: false,
  };
};


interface WorkflowFormContextType {
  form: UseFormReturn<WorkflowFormData>;
  images: ImageFile[];
  updateImageMetadata: (imageId: string, metadata: Partial<z.infer<typeof imageMetadataSchema>>) => void;
  initializeImages: (images: ImageFile[]) => void;
  getImageMetadata: (imageId: string) => z.infer<typeof imageMetadataSchema> | undefined;
  addImages: (newImages: ImageFile[]) => void;
  updateImage: (imageId: string, updates: Partial<ImageFile>) => void;
  removeImage: (imageId: string) => void;
}

const WorkflowFormContext = createContext<WorkflowFormContextType | undefined>(undefined);

interface WorkflowFormProviderProps {
  children: ReactNode;
  uploadType: UploadType;
  soccerMatchData?: SoccerMatchMetadata | null;
  selectedPlayers?: SoccerPlayer[];
  musicEventData?: MusicEventMetadata | null;
}

export function WorkflowFormProvider({ 
  children, 
  uploadType,
  soccerMatchData,
  selectedPlayers = [],
  musicEventData
}: WorkflowFormProviderProps) {
  const [imageFiles, setImageFiles] = useState<ImageFile[]>([]);
  
  // Load stored data or use provided data
  const storedEventDetails = loadStoredEventDetails();
  const eventDetailsData = musicEventData?.festivalData ? {
    festivalName: musicEventData.festivalData.festival?.name || '',
    year: musicEventData.festivalData.festival?.year || '',
    location: musicEventData.festivalData.festival?.location || '',
    country: musicEventData.festivalData.festival?.country || '',
    selectedBand: musicEventData.festivalData.selectedBands?.[0],
    selectedBandMembers: storedEventDetails.selectedBandMembers, // Always use stored band members
    photographerWikidataId: storedEventDetails.photographerWikidataId, // Always use stored Q-ID
    addToWikiPortraitsConcerts: musicEventData.festivalData.addToWikiPortraitsConcerts || false,
  } : storedEventDetails;

  const form = useForm<WorkflowFormData>({
    resolver: zodResolver(workflowFormSchema),
    defaultValues: {
      uploadType,
      eventDetails: eventDetailsData,
      categories: {
        selectedCategories: [],
        newCategoryName: '',
        categoryInput: '',
      },
      templates: {
        selectedLanguage: 'en',
        templateCode: '',
        customTemplateName: '',
      },
      upload: {
        currentStep: 'template',
        templateCreated: false,
        uploadProgress: 0,
        currentUploadIndex: 0,
        stepStatuses: {
          template: 'pending',
          images: 'pending',
          complete: 'pending'
        }
      },
      imageMetadata: [],
      soccerMatchData,
      selectedPlayers,
      musicEventData,
    },
    mode: 'onChange'
  });

  // Sync form when uploadType prop changes
  useEffect(() => {
    const currentUploadType = form.getValues('uploadType');
    if (currentUploadType !== uploadType) {
      form.setValue('uploadType', uploadType);
    }
  }, [uploadType, form]);

  // Save form data to localStorage when eventDetails change
  useEffect(() => {
    const subscription = form.watch((value, { name }) => {
      if (name?.startsWith('eventDetails.')) {
        const eventDetails = value.eventDetails;
        if (eventDetails) {
          // Save individual fields to localStorage
          if (eventDetails.festivalName) setItem(KEYS.FESTIVAL_NAME, eventDetails.festivalName);
          if (eventDetails.year) setItem(KEYS.FESTIVAL_YEAR, eventDetails.year);
          if (eventDetails.location) setItem(KEYS.FESTIVAL_LOCATION, eventDetails.location);
          if (eventDetails.country) setItem(KEYS.FESTIVAL_COUNTRY, eventDetails.country);
          // Author info is handled by Q-ID only - no need to save username/fullname
          
          // Save band info
          if (eventDetails.selectedBand) {
            const band = eventDetails.selectedBand;
            if (band.id) setItem(KEYS.FESTIVAL_BAND_ID, band.id);
            if (band.name) setItem(KEYS.FESTIVAL_BAND_NAME, band.name);
            if (band.wikipediaUrl) setItem(KEYS.FESTIVAL_BAND_WIKIPEDIA, band.wikipediaUrl);
            if (band.wikidataUrl) setItem(KEYS.FESTIVAL_BAND_WIKIDATA, band.wikidataUrl);
            if (band.musicbrainzId) setItem(KEYS.FESTIVAL_BAND_MUSICBRAINZ, band.musicbrainzId);
            if (band.country) setItem(KEYS.FESTIVAL_BAND_COUNTRY, band.country);
          }
          
          // Save selected band members
          if (eventDetails.selectedBandMembers && eventDetails.selectedBand) {
            const currentBandId = eventDetails.selectedBand.id || `pending-band-${eventDetails.selectedBand.name}`;
            if (currentBandId) {
              saveSelectedBandMembers(currentBandId, eventDetails.selectedBandMembers);
            }
          }
        }
      }
    });
    
    return () => subscription.unsubscribe();
  }, [form]);

  // Photographer details are fetched on-demand from Q-ID when needed
  // No need to pre-populate form fields

  const updateImageMetadata = (imageId: string, metadata: Partial<z.infer<typeof imageMetadataSchema>>) => {
    const currentImages = form.getValues('imageMetadata');
    const imageIndex = imageFiles.findIndex(img => img.id === imageId);
    
    if (imageIndex >= 0 && imageIndex < currentImages.length) {
      const updatedImages = [...currentImages];
      updatedImages[imageIndex] = {
        ...updatedImages[imageIndex],
        ...metadata
      };
      form.setValue('imageMetadata', updatedImages);
    }
  };

  const addImages = (newImages: ImageFile[]) => {
    const updatedImages = [...imageFiles, ...newImages];
    setImageFiles(updatedImages);
    
    // Also update the form metadata
    const currentMetadata = form.getValues('imageMetadata');
    const newMetadata = newImages.map(img => ({
      description: img.metadata?.description || '',
      categories: img.metadata?.categories || [],
      date: img.metadata?.date || '',
      author: img.metadata?.author || '',
      source: img.metadata?.source || '',
      license: img.metadata?.license || '',
      permission: img.metadata?.permission || '',
      otherVersions: img.metadata?.otherVersions || '',
      additionalCategories: img.metadata?.additionalCategories || [],
      template: img.metadata?.template,
      templateModified: img.metadata?.templateModified || false,
    }));
    form.setValue('imageMetadata', [...currentMetadata, ...newMetadata]);
  };

  const updateImage = (imageId: string, updates: Partial<ImageFile>) => {
    setImageFiles(prev => 
      prev.map(img => 
        img.id === imageId ? { ...img, ...updates } : img
      )
    );
  };

  const removeImage = (imageId: string) => {
    const imageIndex = imageFiles.findIndex(img => img.id === imageId);
    if (imageIndex >= 0) {
      // Remove from imageFiles
      setImageFiles(prev => prev.filter(img => img.id !== imageId));
      
      // Remove from form metadata
      const currentMetadata = form.getValues('imageMetadata');
      const updatedMetadata = currentMetadata.filter((_, index) => index !== imageIndex);
      form.setValue('imageMetadata', updatedMetadata);
    }
  };

  const initializeImages = (newImages: ImageFile[]) => {
    setImageFiles(newImages);
    const imageMetadata = newImages.map(img => ({
      description: img.metadata?.description || '',
      categories: img.metadata?.categories || [],
      date: img.metadata?.date || '',
      author: img.metadata?.author || '',
      source: img.metadata?.source || '',
      license: img.metadata?.license || '',
      permission: img.metadata?.permission || '',
      otherVersions: img.metadata?.otherVersions || '',
      additionalCategories: img.metadata?.additionalCategories || [],
      template: img.metadata?.template,
      templateModified: img.metadata?.templateModified || false,
    }));
    form.setValue('imageMetadata', imageMetadata);
  };

  const getImageMetadata = (imageId: string): z.infer<typeof imageMetadataSchema> | undefined => {
    const currentImages = form.getValues('imageMetadata');
    const imageIndex = imageFiles.findIndex(img => img.id === imageId);
    return imageIndex >= 0 ? currentImages[imageIndex] : undefined;
  };

  const contextValue: WorkflowFormContextType = {
    form,
    images: imageFiles,
    updateImageMetadata,
    initializeImages,
    getImageMetadata,
    addImages,
    updateImage,
    removeImage,
  };

  return (
    <WorkflowFormContext.Provider value={contextValue}>
      <FormProvider {...form}>
        {children}
      </FormProvider>
    </WorkflowFormContext.Provider>
  );
}

export function useWorkflowForm() {
  const context = useContext(WorkflowFormContext);
  if (context === undefined) {
    throw new Error('useWorkflowForm must be used within a WorkflowFormProvider');
  }
  return context;
}

// Convenience hook to get the form instance directly
export function useWorkflowFormContext() {
  const { form } = useWorkflowForm();
  return form;
}