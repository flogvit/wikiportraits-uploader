'use client';

import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { FolderPlus, Check, AlertCircle, Eye, Plus, X } from 'lucide-react';
import { ImageFile } from '@/types';
import { generateMusicCategories, getCategoriesToCreate as getMusicCategoriesToCreate } from '@/utils/music-categories';
import { getAllCategoriesFromImages } from '@/utils/category-extractor';
import CategoryCreationModal from '@/components/modals/CategoryCreationModal';


interface CategoryCreationInfo {
  categoryName: string;
  shouldCreate: boolean;
  parentCategory?: string;
  description?: string;
  eventName?: string;
  teamName?: string;
}

interface CategoriesPaneProps {
  onComplete?: () => void;
}

export default function CategoriesPane({
  onComplete
}: CategoriesPaneProps) {
  const [categoriesToCreate, setCategoriesToCreate] = useState<CategoryCreationInfo[]>([]);
  const [showCreationModal, setShowCreationModal] = useState(false);

  const { control, watch, setValue } = useFormContext<WorkflowFormData>();

  // Get all data from the unified form
  const uploadType = watch('uploadType');
  const images = watch('images');
  const musicEventData = watch('musicEventData');
  
  const watchedData = watch('categories');
  const allCategories = watchedData.selectedCategories || [];
  const createdCategories = new Set([]);  // Will be managed differently
  const newCategoryInput = watchedData.newCategoryName || '';

  // Generate categories based on upload type and data
  useEffect(() => {
    // Get categories from images if they exist
    let imageCategories: string[] = [];
    if (images && images.length > 0) {
      // Convert form image metadata back to ImageFile format for the utility function
      const imageFiles: ImageFile[] = images.map((imgData, index) => ({
        id: `image-${index}`,
        file: new File([], `image-${index}`), // Placeholder file
        metadata: {
          description: imgData.description,
          categories: imgData.categories,
          date: imgData.date,
          author: imgData.author,
          source: imgData.source,
          license: imgData.license,
          permission: imgData.permission,
          otherVersions: imgData.otherVersions,
          additionalCategories: imgData.additionalCategories,
          template: imgData.template,
          templateModified: imgData.templateModified,
        }
      }));
      
      imageCategories = getAllCategoriesFromImages(imageFiles);
    }
    
    // Get event-specific categories (works without images)
    let eventCategories: string[] = [];
    if (uploadType === 'music' && musicEventData) {
      eventCategories = generateMusicCategories(musicEventData);
    }
    
    // Combine all categories and remove duplicates
    const combinedCategories = new Set([...imageCategories, ...eventCategories]);
    
    // Also add all categories that need creation (so they appear in the unified list)
    let toCreate: CategoryCreationInfo[] = [];
    if (uploadType === 'music' && musicEventData) {
      toCreate = getMusicCategoriesToCreate(musicEventData);
    }
    
    // Add categories that need creation to the unified list
    toCreate.forEach((cat: CategoryCreationInfo) => combinedCategories.add(cat.categoryName));
    
    setValue('categories.selectedCategories', Array.from(combinedCategories).sort());
    setCategoriesToCreate(toCreate);
  }, [uploadType, musicEventData, images, setValue]);


  const handleAddCategory = () => {
    const trimmedInput = newCategoryInput.trim();
    if (trimmedInput && !allCategories.includes(trimmedInput)) {
      setValue('categories.selectedCategories', [...allCategories, trimmedInput].sort());
      setValue('categories.newCategoryName', '');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setValue('categories.selectedCategories', allCategories.filter(cat => cat !== categoryToRemove));
  };

  const getCategoryStatus = (categoryName: string): 'created' | 'needs_creation' | 'unknown' => {
    if (createdCategories.has(categoryName)) {
      return 'created';
    }
    const categoryToCreate = categoriesToCreate.find((cat: CategoryCreationInfo) => cat.categoryName === categoryName);
    if (categoryToCreate) {
      return 'needs_creation';
    }
    return 'unknown';
  };

  const handleCompleteStep = () => {
    onComplete?.();
  };

  // Check if all prerequisites are met
  const hasValidData = () => {
    if (uploadType === 'music') {
      return musicEventData?.eventType && 
             ((musicEventData.eventType === 'festival' && musicEventData.festivalData?.festival?.name) ||
              (musicEventData.eventType === 'concert' && musicEventData.concertData?.concert?.artist?.name));
    }
    return true; // Allow general uploads to proceed
  };

  const pendingCategories = categoriesToCreate.filter(cat => !createdCategories.has(cat.categoryName));
  const allCategoriesCreated = categoriesToCreate.length > 0 && pendingCategories.length === 0;


  if (!hasValidData()) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <FolderPlus className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-card-foreground mb-2">Categories</h2>
          <p className="text-muted-foreground">
            Create and organize Wikimedia Commons categories for your event
          </p>
        </div>
        
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <p className="text-warning font-medium">⚠️ Event Details Required</p>
          <p className="text-muted-foreground text-sm mt-1">
            Please complete the previous workflow steps to generate categories:
          </p>
          <ul className="text-muted-foreground text-sm mt-2 space-y-1">
            {uploadType === 'music' && (
              <>
                <li>• Event Type: {musicEventData?.eventType ? '✅' : '❌'} Select festival or concert</li>
                <li>• Event Details: {(musicEventData?.festivalData?.festival?.name || musicEventData?.concertData?.concert?.artist?.name || (workflowType === 'music-event' && eventDetails.musicEvent?.mainBand)) ? '✅' : '❌'} Add event information</li>
              </>
            )}
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="text-center">
        <FolderPlus className="w-12 h-12 text-primary mx-auto mb-4" />
        <h2 className="text-2xl font-semibold text-card-foreground mb-2">Categories</h2>
        <p className="text-muted-foreground">
          Manage Wikimedia Commons categories for your {uploadType} event
        </p>
      </div>

      {/* Categories */}
      <div className="bg-card rounded-lg border border-border p-6">
        <h3 className="text-lg font-semibold text-card-foreground mb-4 flex items-center">
          <FolderPlus className="w-5 h-5 mr-2" />
          Categories ({allCategories.length})
        </h3>
        
        {/* Add new category input */}
        <div className="flex space-x-2 mb-4">
          <Controller
            name="categories.newCategoryName"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                value={field.value || ''}
                onChange={(e) => field.onChange(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                placeholder="Add new category"
                className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
              />
            )}
          />
          <button
            onClick={handleAddCategory}
            disabled={!newCategoryInput.trim()}
            className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:bg-muted disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>
        
        {allCategories.length > 0 ? (
          <div className="space-y-3">
            {allCategories.map((category: string, index: number) => {
              const status = getCategoryStatus(category);
              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3 rounded-lg border ${
                    status === 'created' 
                      ? 'bg-success/5 border-success/20' 
                      : status === 'needs_creation'
                      ? 'bg-warning/5 border-warning/20'
                      : 'bg-muted/30 border-border'
                  }`}
                >
                  <div className="flex-1">
                    <div className="font-medium text-card-foreground flex items-center">
                      {status === 'created' ? (
                        <Check className="w-4 h-4 text-success mr-2" />
                      ) : status === 'needs_creation' ? (
                        <AlertCircle className="w-4 h-4 text-warning mr-2" />
                      ) : (
                        <Eye className="w-4 h-4 text-muted-foreground mr-2" />
                      )}
                      {category}
                    </div>
                    {/* Show description if available */}
                    {(() => {
                      const categoryToCreate = categoriesToCreate.find(cat => cat.categoryName === category);
                      return categoryToCreate?.description && (
                        <p className="text-sm text-muted-foreground mt-1">{categoryToCreate.description}</p>
                      );
                    })()}
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="text-sm">
                      {status === 'created' ? (
                        <span className="text-success font-medium">Created</span>
                      ) : status === 'needs_creation' ? (
                        <span className="text-warning font-medium">Needs Creation</span>
                      ) : (
                        <span className="text-muted-foreground font-medium">Ready</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveCategory(category)}
                      className="text-muted-foreground hover:text-destructive"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-muted-foreground text-sm">No categories found yet.</p>
        )}

        {/* Create categories button */}
        {pendingCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <button
              onClick={() => setShowCreationModal(true)}
              className="w-full px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Create Missing Categories ({pendingCategories.length})
            </button>
          </div>
        )}
      </div>

      {/* Completion status */}
      {allCategoriesCreated && (
        <div className="bg-success/10 border border-success/20 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-success font-medium">✅ Categories Ready</p>
              <p className="text-muted-foreground text-sm mt-1">
                All required categories have been created and are ready for use.
              </p>
            </div>
            <button
              onClick={handleCompleteStep}
              className="px-6 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              Continue to Wikidata
            </button>
          </div>
        </div>
      )}

      {/* Category Creation Modal */}
      <CategoryCreationModal
        isOpen={showCreationModal}
        onClose={() => setShowCreationModal(false)}
        categories={pendingCategories}
        onCreateCategories={async (categories) => {
          // Handle category creation
          console.log('Creating categories:', categories);
          setShowCreationModal(false);
        }}
      />
    </div>
  );
}