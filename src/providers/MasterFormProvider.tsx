'use client';

import React from 'react';
import { FormProvider, useForm } from 'react-hook-form';
import { CategoriesFormProvider, useCategoriesForm } from './CategoriesFormProvider';
import { ImagesFormProvider, useImagesForm } from './ImagesFormProvider';
import { TemplatesFormProvider, defaultTemplateGenerators, useTemplatesForm } from './TemplatesFormProvider';
import { UploadFormProvider, useUploadForm } from './UploadFormProvider';
import { MusicDetailsFormProvider, useMusicDetailsForm } from './MusicDetailsFormProvider';
import { SoccerDetailsFormProvider, useSoccerDetailsForm } from './SoccerDetailsFormProvider';

interface MasterFormProviderProps {
  children: React.ReactNode;
  defaultValues?: Record<string, any>;
  config?: {
    categories?: {
      categoryTypes?: string[];
      autoCategories?: Array<{
        template: string;
        source: string;
        type?: string;
      }>;
    };
    images?: {
      validationRules?: any[];
      maxFiles?: number;
      maxFileSize?: number;
      allowedTypes?: string[];
    };
    templates?: {
      generators?: any[];
      defaultLanguage?: string;
      supportedLanguages?: string[];
    };
    upload?: {
      maxConcurrent?: number;
      retryAttempts?: number;
      retryDelay?: number;
      uploadHandlers?: Record<string, (item: any) => Promise<any>>;
    };
  };
}

export function MasterFormProvider({ 
  children, 
  defaultValues = {},
  config = {}
}: MasterFormProviderProps) {
  const form = useForm({
    defaultValues: {
      // Universal form keys
      categories: [],
      images: [],
      templates: [],
      upload: [],
      uploadStatus: 'idle',
      templateLanguage: config.templates?.defaultLanguage || 'en',
      
      // Domain-specific form keys
      musicDetails: {
        event: null,
        festival: null,
        band: null,
        bands: [],
        musicians: [],
        venue: null,
        date: null,
        startTime: null,
        endTime: null,
        genres: []
      },
      soccerDetails: {
        match: null,
        homeTeam: null,
        awayTeam: null,
        players: [],
        venue: null,
        date: null,
        competition: null,
        score: null,
        referee: null,
        attendance: null,
        stadium: null,
        location: null
      },
      
      // Merge any provided default values
      ...defaultValues
    }
  });

  const categoriesConfig = {
    categoryTypes: config.categories?.categoryTypes || ['music', 'location', 'year', 'genre'],
    autoCategories: config.categories?.autoCategories || []
  };

  const imagesConfig = {
    validationRules: config.images?.validationRules || [
      { type: 'file-type', allowed: ['image/jpeg', 'image/png', 'image/webp'] },
      { type: 'file-size', maxSize: 50 * 1024 * 1024 } // 50MB
    ],
    maxFiles: config.images?.maxFiles || 50,
    maxFileSize: config.images?.maxFileSize || 50 * 1024 * 1024,
    allowedTypes: config.images?.allowedTypes || ['image/jpeg', 'image/png', 'image/webp']
  };

  const templatesConfig = {
    generators: config.templates?.generators || defaultTemplateGenerators,
    defaultLanguage: config.templates?.defaultLanguage || 'en',
    supportedLanguages: config.templates?.supportedLanguages || ['en', 'de', 'fr', 'es', 'it', 'pt', 'ru', 'zh']
  };

  const uploadConfig = {
    maxConcurrent: config.upload?.maxConcurrent || 3,
    retryAttempts: config.upload?.retryAttempts || 3,
    retryDelay: config.upload?.retryDelay || 1000,
    uploadHandlers: config.upload?.uploadHandlers || {
      image: defaultImageUploadHandler,
      template: defaultTemplateUploadHandler,
      entity: defaultEntityUploadHandler,
      category: defaultCategoryUploadHandler
    }
  };

  console.log('🏗️ MasterFormProvider initialized with form keys:', Object.keys(form.getValues()));

  return (
    <FormProvider {...form}>
      <CategoriesFormProvider config={categoriesConfig}>
        <ImagesFormProvider config={imagesConfig}>
          <TemplatesFormProvider config={templatesConfig}>
            <UploadFormProvider config={uploadConfig}>
              <MusicDetailsFormProvider>
                <SoccerDetailsFormProvider>
                  {children}
                </SoccerDetailsFormProvider>
              </MusicDetailsFormProvider>
            </UploadFormProvider>
          </TemplatesFormProvider>
        </ImagesFormProvider>
      </CategoriesFormProvider>
    </FormProvider>
  );
}

// Default upload handlers - these would be implemented with actual API calls
async function defaultImageUploadHandler(item: any): Promise<any> {
  console.log('📸 Uploading image:', item.name);
  
  // Simulate upload progress
  return new Promise((resolve) => {
    let progress = 0;
    const interval = setInterval(() => {
      progress += 10;
      // Update progress in form would happen here
      
      if (progress >= 100) {
        clearInterval(interval);
        resolve({
          success: true,
          url: `https://commons.wikimedia.org/wiki/File:${item.name}`,
          message: 'Image uploaded successfully'
        });
      }
    }, 200);
  });
}

async function defaultTemplateUploadHandler(item: any): Promise<any> {
  console.log('📄 Creating template:', item.name);
  
  // Simulate template creation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        url: `https://commons.wikimedia.org/wiki/Template:${item.name}`,
        message: 'Template created successfully'
      });
    }, 1000);
  });
}

async function defaultEntityUploadHandler(item: any): Promise<any> {
  console.log('🆕 Creating entity:', item.name);
  
  // Simulate entity creation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        qid: `Q${Math.floor(Math.random() * 1000000)}`,
        url: `https://wikidata.org/wiki/Q${Math.floor(Math.random() * 1000000)}`,
        message: 'Entity created successfully'
      });
    }, 1500);
  });
}

async function defaultCategoryUploadHandler(item: any): Promise<any> {
  console.log('📁 Creating category:', item.name);
  
  // Simulate category creation
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve({
        success: true,
        url: `https://commons.wikimedia.org/wiki/Category:${item.name}`,
        message: 'Category created successfully'
      });
    }, 800);
  });
}

// Helper hook to access all form providers from a single location
export function useAllFormProviders() {
  return {
    categoriesForm: useCategoriesForm(),
    imagesForm: useImagesForm(),
    templatesForm: useTemplatesForm(),
    uploadForm: useUploadForm(),
    musicDetailsForm: useMusicDetailsForm(),
    soccerDetailsForm: useSoccerDetailsForm(),
  };
}

// Export all form providers for individual use
export {
  CategoriesFormProvider,
  ImagesFormProvider,
  TemplatesFormProvider,
  UploadFormProvider,
  MusicDetailsFormProvider,
  SoccerDetailsFormProvider
};