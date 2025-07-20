// Export all form providers
export { 
  CategoriesFormProvider, 
  useCategoriesForm 
} from './CategoriesFormProvider';

export { 
  ImagesFormProvider, 
  useImagesForm 
} from './ImagesFormProvider';

export { 
  TemplatesFormProvider, 
  useTemplatesForm,
  defaultTemplateGenerators
} from './TemplatesFormProvider';

export { 
  UploadFormProvider, 
  useUploadForm 
} from './UploadFormProvider';

export { 
  MusicDetailsFormProvider, 
  useMusicDetailsForm 
} from './MusicDetailsFormProvider';

export { 
  SoccerDetailsFormProvider, 
  useSoccerDetailsForm 
} from './SoccerDetailsFormProvider';

export { 
  MasterFormProvider,
  useAllFormProviders
} from './MasterFormProvider';

export {
  UniversalFormProvider,
  useUniversalForm,
  useUniversalFormEntities,
  useUniversalFormEventDetails,
  useUniversalFormFiles,
  useUniversalFormCategories
} from './UniversalFormProvider';

// Re-export types
export type { ImageMetadata } from './ImagesFormProvider';
export type { Template } from './TemplatesFormProvider';
export type { Category } from './CategoriesFormProvider';
export type { UploadItem, UploadStats } from './UploadFormProvider';