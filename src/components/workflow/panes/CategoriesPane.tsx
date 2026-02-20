'use client';

import { useState } from 'react';
import { usePublishData } from '@/providers/PublishDataProvider';
import { FolderPlus, Check, AlertCircle, Eye, ExternalLink } from 'lucide-react';

interface CategoriesPaneProps {
  onComplete?: () => void;
}

export default function CategoriesPane({
  onComplete
}: CategoriesPaneProps) {
  const [showAllExisting, setShowAllExisting] = useState(false);

  // Use centralized publish data
  const {
    categories: categoryActions,
    isCalculating
  } = usePublishData();

  // Derive display data from actions
  const allCategories = categoryActions.map(c => c.categoryName);
  const existingCategories = new Set(categoryActions.filter(c => c.exists).map(c => c.categoryName));
  const categoriesToCreate = categoryActions.filter(c => c.shouldCreate).map(c => ({
    categoryName: c.categoryName,
    shouldCreate: c.shouldCreate,
    parentCategory: c.parentCategory,
    additionalParents: c.additionalParents,
    description: c.description,
  }));
  const createdCategories = new Set(categoryActions.filter(c => c.status === 'completed').map(c => c.categoryName));

  const getCategoryStatus = (categoryName: string): 'created' | 'needs_creation' | 'unknown' => {
    const action = categoryActions.find(c => c.categoryName === categoryName);
    if (!action) return 'unknown';

    if (action.status === 'completed') return 'created';
    if (action.shouldCreate && !action.exists) return 'needs_creation';
    if (action.exists) return 'unknown'; // Existing = ready to use
    return 'unknown';
  };

  const handleCompleteStep = () => {
    onComplete?.();
  };

  // Filter categories that need creation
  const pendingCategories = categoriesToCreate.filter(cat =>
    !existingCategories.has(cat.categoryName)
  );
  const allCategoriesCreated = categoriesToCreate.length > 0 && pendingCategories.length === 0;

  // Show message if no categories yet
  if (allCategories.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <FolderPlus className="w-12 h-12 text-primary mx-auto mb-4" />
          <h2 className="text-2xl font-semibold text-card-foreground mb-2">Categories</h2>
          <p className="text-muted-foreground">
            Create and organize Wikimedia Commons categories for your event
          </p>
        </div>

        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <p className="text-info font-medium">ℹ️ Categories will be generated automatically</p>
          <p className="text-muted-foreground text-sm mt-1">
            Once you complete event details and select performers, categories will be generated automatically.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {/* Calculating categories */}
      {isCalculating && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-800">Calculating categories...</p>
        </div>
      )}

      {/* Existing Category Tree from Commons */}
      {!isCalculating && existingCategories.size > 0 && (
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
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-card-foreground flex items-center">
            <FolderPlus className="w-5 h-5 mr-2" />
            Categories ({allCategories.length})
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Categories are automatically generated from your images. Add categories to images in the Images pane.
          </p>
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
                  <div className="text-sm">
                    {status === 'created' ? (
                      <span className="text-success font-medium">Created</span>
                    ) : status === 'needs_creation' ? (
                      <span className="text-warning font-medium">Needs Creation</span>
                    ) : (
                      <span className="text-muted-foreground font-medium">Ready</span>
                    )}
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