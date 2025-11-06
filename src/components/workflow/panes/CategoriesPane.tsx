'use client';

import { useState, useEffect } from 'react';
import { Controller } from 'react-hook-form';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import { FolderPlus, Check, AlertCircle, Eye, Plus, X, ExternalLink, RefreshCw } from 'lucide-react';
import { generateMusicCategories, getCategoriesToCreate as getMusicCategoriesToCreate, detectBandCategories } from '@/utils/music-categories';
import { getAllCategoriesFromImages } from '@/utils/category-extractor';
import { getAllBandCategoryStructures, flattenBandCategories } from '@/utils/band-categories';
import CategoryCreationModal from '@/components/modals/CategoryCreationModal';
import { CommonsClient } from '@/lib/api/CommonsClient';
import { lookupCache, CacheType } from '@/utils/lookup-cache';


interface CategoryCreationInfo {
  categoryName: string;
  shouldCreate: boolean;
  parentCategory?: string;
  additionalParents?: string[];
  description?: string;
  eventName?: string;
  teamName?: string;
}

interface CategoriesPaneProps {
  onCompleteAction?: () => void;
}

export default function CategoriesPane({
  onCompleteAction
}: CategoriesPaneProps) {
  const [categoriesToCreate, setCategoriesToCreate] = useState<CategoryCreationInfo[]>([]);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [existingCategories, setExistingCategories] = useState<Set<string>>(new Set());
  const [loadingCategoryTree, setLoadingCategoryTree] = useState(false);
  const [showAllExisting, setShowAllExisting] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0); // Used to trigger manual refresh

  const { control, watch, setValue } = useUniversalForm();

  // Get all data from the unified form
  const workflowType = watch('workflowType');
  const uploadType = workflowType === 'music-event' ? 'music' : 'general';
  const images = watch('files.queue') || [];
  const eventDetails = watch('eventDetails');
  const organizations = watch('entities.organizations') || [];
  const people = watch('entities.people') || [];

  // Get the main band - organizations is an array of WikidataEntity objects
  const selectedBand = organizations.length > 0 ? organizations[0] : null;

  // Try multiple paths to get the band name
  const selectedBandName = selectedBand?.entity?.labels?.en?.value ||
                          selectedBand?.labels?.en?.value ||
                          selectedBand?.labels?.en ||
                          selectedBand?.entity?.labels?.en ||
                          null;

  console.log('🎸 CategoriesPane - Band info:', {
    organizationsCount: organizations.length,
    selectedBand,
    selectedBandName,
    firstOrgStructure: organizations[0] ? {
      hasEntity: !!organizations[0].entity,
      hasLabels: !!organizations[0].labels,
      entityLabels: organizations[0].entity?.labels,
      directLabels: organizations[0].labels,
      fullOrg: organizations[0]
    } : null
  });

  console.log('🎤 CategoriesPane - Performers info:', {
    peopleCount: people.length,
    people: people.map(p => ({
      id: p.id,
      name: p.labels?.en?.value,
      hasP373: !!p.claims?.P373
    }))
  });

  const musicEventData = eventDetails;
  
  const watchedData = watch('computed.categories') || {};
  const allCategories = (watchedData as any)?.all || [];
  const createdCategories = new Set([]);  // Will be managed differently
  const newCategoryInput = '';

  // Load existing category tree from Commons
  useEffect(() => {
    const loadCategoryTree = async () => {
      if (!eventDetails?.title || allCategories.length === 0) {
        // Reset checked flag if no categories
        setValue('computed.categories.checked' as any, false);
        return;
      }

      setLoadingCategoryTree(true);
      // Mark as not checked while loading
      setValue('computed.categories.checked' as any, false);
      const existing = new Set<string>();

      try {
        // 1. WikiPortraits always exists
        existing.add('WikiPortraits');

        // 2. Check all categories in our list to see which exist
        // This is more accurate than trying to guess which to check
        const categoriesToCheck = [...allCategories];

        // Batch check categories for better performance
        const checkPromises = categoriesToCheck.map(async (categoryName) => {
          try {
            const exists = await CommonsClient.categoryExists(categoryName);
            if (exists) {
              existing.add(categoryName);
            }
          } catch (error) {
            console.error(`Error checking category "${categoryName}":`, error);
          }
        });

        await Promise.all(checkPromises);

        setExistingCategories(existing);
        // Mark as checked once verification is complete
        setValue('computed.categories.checked' as any, true);
      } catch (error) {
        console.error('Error loading category tree:', error);
        setValue('computed.categories.checked' as any, false);
      } finally {
        setLoadingCategoryTree(false);
      }
    };

    loadCategoryTree();
  }, [eventDetails?.commonsCategory, eventDetails?.title, allCategories, refreshKey, setValue]); // Changed to allCategories (full array) to detect any changes

  // Generate categories based on upload type and data
  useEffect(() => {
    const generateCategories = async () => {
      // Get categories from images if they exist
      let imageCategories: string[] = [];
      if (images && images.length > 0) {
      // Convert form image metadata back to ImageFile format for the utility function
      const imageFiles = images.map((imgData: any, index: number) => ({
        id: `image-${index}`,
        file: new File([], `image-${index}`), // Placeholder file
        preview: '', // Add missing preview property
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
      
      imageCategories = getAllCategoriesFromImages(imageFiles as any);
    }
    
    // Get event-specific categories (works without images)
    // Include band-specific categories if a band is selected
    let eventCategories: string[] = [];
    if (uploadType === 'music' && musicEventData) {
      const year = musicEventData.date ? new Date(musicEventData.date).getFullYear().toString() : '';
      const eventName = musicEventData.commonsCategory || (year ? `${musicEventData.title} ${year}` : musicEventData.title);

      // Generate base event categories
      eventCategories = generateMusicCategories(musicEventData as any);

      // Add band-at-event category if band is selected
      if (selectedBandName && eventName) {
        const bandCategory = `${selectedBandName} at ${eventName}`;
        eventCategories.push(bandCategory);
        console.log('📁 Adding band category:', bandCategory);
      } else {
        console.log('📁 NOT adding band category - missing:', { selectedBandName, eventName });
      }
    }
    
    // Combine all categories and remove duplicates
    const combinedCategories = new Set([...imageCategories, ...eventCategories]);
    
    // Also add all categories that need creation (so they appear in the unified list)
    let toCreate: CategoryCreationInfo[] = [];
    if (uploadType === 'music' && musicEventData) {
      toCreate = getMusicCategoriesToCreate(musicEventData as any);
    }

    // Generate proper band category structures with hierarchy
    const year = musicEventData?.date ? new Date(musicEventData.date).getFullYear().toString() : '';
    const eventName = musicEventData?.commonsCategory ||
                     (year ? `${musicEventData.title} ${year}` : musicEventData?.title);

    if (eventName && year && selectedBandName) {
      // Generate complete band category structure
      const bandStructures = await getAllBandCategoryStructures(
        [{ name: selectedBandName, qid: selectedBand?.id || '' }],
        year,
        eventName
      );

      const bandCategories = flattenBandCategories(bandStructures);
      console.log('📁 Generated band category structure:', bandStructures);

      // Add all band categories to the list
      toCreate = [...toCreate, ...bandCategories];

      // Add band categories to the combined list so they appear in UI
      bandCategories.forEach(cat => combinedCategories.add(cat.categoryName));
    }

    // Generate performer categories for individual band members/people
    if (people && people.length > 0) {
      console.log('🎤 Generating categories for', people.length, 'performers');

      try {
        const { getPerformerCategories } = await import('@/utils/performer-categories');
        const performerCategoryInfos = await getPerformerCategories(people);

        performerCategoryInfos.forEach(info => {
          console.log('🎤 Adding performer category:', info.commonsCategory, 'from', info.source);

          // Add to combined categories
          combinedCategories.add(info.commonsCategory);

          // Add to categories to create if needed
          if (info.needsCreation) {
            toCreate.push({
              categoryName: info.commonsCategory,
              shouldCreate: true,
              description: info.description,
              eventName: info.performerName
            });
          }
        });
      } catch (error) {
        console.error('Error generating performer categories:', error);
      }
    }

    // Add categories that need creation to the unified list
    toCreate.forEach((cat: CategoryCreationInfo) => combinedCategories.add(cat.categoryName));

      setValue('computed.categories.all' as any, Array.from(combinedCategories).sort());
      setCategoriesToCreate(toCreate);
    };

    generateCategories();
  }, [uploadType, musicEventData, images, organizations, people, selectedBandName, selectedBand, setValue]);


  const handleAddCategory = () => {
    const trimmedInput = newCategoryInput.trim();
    if (trimmedInput && !allCategories.includes(trimmedInput)) {
      setValue('computed.categories.all' as any, [...allCategories, trimmedInput].sort());
      // Invalidate cache for the new category so it gets checked fresh
      lookupCache.invalidate(CacheType.COMMONS_CATEGORY_EXISTS, `Category:${trimmedInput}`);
      // setValue('categories.newCategoryName', ''); // Not needed for this structure
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setValue('computed.categories.all' as any, allCategories.filter((cat: string) => cat !== categoryToRemove));
  };

  const getCategoryStatus = (categoryName: string): 'created' | 'needs_creation' | 'unknown' => {
    // Check if it exists on Commons
    if (existingCategories.has(categoryName)) {
      return 'unknown'; // Shows as "Ready" (existing category)
    }

    if (createdCategories.has(categoryName)) {
      return 'created';
    }

    const categoryToCreate = categoriesToCreate.find((cat: CategoryCreationInfo) => cat.categoryName === categoryName);
    if (categoryToCreate) {
      // Only mark as needs_creation if shouldCreate is true AND it doesn't exist
      return categoryToCreate.shouldCreate ? 'needs_creation' : 'unknown';
    }
    return 'unknown';
  };

  const handleCompleteStep = () => {
    onCompleteAction?.();
  };

  // Check if all prerequisites are met
  const hasValidData = () => {
    if (uploadType === 'music') {
      // Check for unified format (title + date/year) OR legacy format (festival/mainBand)
      const hasUnifiedFormat = musicEventData?.title && musicEventData?.date;
      const hasLegacyFormat = musicEventData?.festival || musicEventData?.mainBand;
      return hasUnifiedFormat || hasLegacyFormat;
    }
    return true; // Allow general uploads to proceed
  };

  // Filter categories that need creation: shouldCreate=true AND not in existingCategories
  const pendingCategories = categoriesToCreate.filter(cat =>
    cat.shouldCreate && !existingCategories.has(cat.categoryName)
  );
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
                <li>• Event Type: {musicEventData?.type ? '✅' : '❌'} Select festival or concert</li>
                <li>• Event Details: {(musicEventData?.title || eventDetails?.mainBand) ? '✅' : '❌'} Add event information</li>
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

      {/* Existing Category Tree from Commons */}
      {loadingCategoryTree && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">Loading existing category tree from Commons...</p>
        </div>
      )}

      {!loadingCategoryTree && existingCategories.size > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-start gap-2 mb-2">
            <Check className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-green-800">
                Found {existingCategories.size} existing {existingCategories.size === 1 ? 'category' : 'categories'} on Commons
              </p>
              <p className="text-xs text-green-700 mt-1">
                These categories already exist and will be used for your upload
              </p>
            </div>
          </div>

          {/* WikiPortraits categories - show separately */}
          {(() => {
            const wikiPortraitsCategories = Array.from(existingCategories).filter(cat =>
              cat.toLowerCase().includes('wikiportraits')
            );
            const otherCategories = Array.from(existingCategories).filter(cat =>
              !cat.toLowerCase().includes('wikiportraits')
            );

            return (
              <>
                {wikiPortraitsCategories.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">WikiPortraits Categories:</p>
                    <div className="flex flex-wrap gap-2">
                      {wikiPortraitsCategories.map((cat) => (
                        <a
                          key={cat}
                          href={`https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(cat)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-green-300 rounded text-xs text-green-800 hover:bg-green-100"
                        >
                          {cat}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {otherCategories.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs font-semibold text-green-800 mb-1">Event Categories ({otherCategories.length}):</p>
                    <div className="flex flex-wrap gap-2">
                      {(showAllExisting ? otherCategories : otherCategories.slice(0, 8)).map((cat) => (
                        <a
                          key={cat}
                          href={`https://commons.wikimedia.org/wiki/Category:${encodeURIComponent(cat)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 bg-white border border-green-300 rounded text-xs text-green-800 hover:bg-green-100"
                        >
                          {cat}
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      ))}
                      {otherCategories.length > 8 && (
                        <button
                          onClick={() => setShowAllExisting(!showAllExisting)}
                          className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded hover:bg-green-200 transition-colors"
                        >
                          {showAllExisting ? '− Show less' : `+ ${otherCategories.length - 8} more`}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      )}

      {/* Categories */}
      <div className="bg-card rounded-lg border border-border p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-card-foreground flex items-center">
            <FolderPlus className="w-5 h-5 mr-2" />
            Categories ({allCategories.length})
          </h3>
          <button
            onClick={() => setRefreshKey(prev => prev + 1)}
            disabled={loadingCategoryTree}
            className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${loadingCategoryTree ? 'animate-spin' : ''}`} />
            Refresh Status
          </button>
        </div>
        
        {/* Add new category input */}
        <div className="flex space-x-2 mb-4">
          <Controller
            name="ui"
            control={control}
            render={({ field }) => (
              <input
                {...field}
                type="text"
                value={newCategoryInput}
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
                    {/* Show parent category and description if available */}
                    {(() => {
                      const categoryToCreate = categoriesToCreate.find(cat => cat.categoryName === category);
                      const categoryIsNew = status === 'needs_creation';
                      const categoryAlreadyExists = existingCategories.has(category);

                      return (
                        <>
                          {(categoryToCreate?.parentCategory || categoryToCreate?.additionalParents) && (
                            <div className="text-xs text-blue-600 mt-1 space-y-0.5">
                              {categoryToCreate.parentCategory && (
                                <p>
                                  {categoryIsNew ? (
                                    <>→ Will be added to: <span className="font-medium">{categoryToCreate.parentCategory}</span></>
                                  ) : categoryAlreadyExists ? (
                                    <>→ Already in: <span className="font-medium">{categoryToCreate.parentCategory}</span></>
                                  ) : (
                                    <>→ Parent: <span className="font-medium">{categoryToCreate.parentCategory}</span></>
                                  )}
                                </p>
                              )}
                              {categoryToCreate.additionalParents && categoryToCreate.additionalParents.length > 0 && (
                                <p>
                                  → Also in: <span className="font-medium">{categoryToCreate.additionalParents.join(', ')}</span>
                                </p>
                              )}
                            </div>
                          )}
                          {categoryToCreate?.description && (
                            <p className="text-sm text-muted-foreground mt-1">{categoryToCreate.description}</p>
                          )}
                        </>
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

        {/* Info about publish pane */}
        {pendingCategories.length > 0 && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-sm text-blue-800">
                💡 <strong>{pendingCategories.length} {pendingCategories.length === 1 ? 'category needs' : 'categories need'} creation.</strong> Go to the <strong>Publish</strong> pane to create them.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}