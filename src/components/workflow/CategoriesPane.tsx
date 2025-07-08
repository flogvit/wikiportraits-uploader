'use client';

import { useState, useEffect } from 'react';
import { FolderPlus, Check, AlertCircle, Eye, Plus, X } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { MusicEventMetadata } from '@/types/music';
import { SoccerMatchMetadata, SoccerPlayer } from '@/components/SoccerMatchWorkflow';
import { UploadType } from '@/components/UploadTypeSelector';
import { generateMusicCategories, getCategoriesToCreate as getMusicCategoriesToCreate } from '@/utils/music-categories';
import { generateSoccerCategories, getCategoriesToCreate as getSoccerCategoriesToCreate } from '@/utils/soccer-categories';
import { getAllCategoriesFromImages } from '@/utils/category-extractor';
import CategoryCreationModal from '@/components/CategoryCreationModal';

interface CategoryCreationInfo {
  categoryName: string;
  shouldCreate: boolean;
  parentCategory?: string;
  description?: string;
  eventName?: string;
  teamName?: string;
}

interface CategoriesPaneProps {
  uploadType: UploadType;
  images: ImageFile[];
  soccerMatchData?: SoccerMatchMetadata | null;
  selectedPlayers?: SoccerPlayer[];
  musicEventData?: MusicEventMetadata | null;
  onComplete?: () => void;
}

export default function CategoriesPane({
  uploadType,
  images,
  soccerMatchData,
  selectedPlayers = [],
  musicEventData,
  onComplete
}: CategoriesPaneProps) {
  const [categoriesToCreate, setCategoriesToCreate] = useState<CategoryCreationInfo[]>([]);
  const [allCategories, setAllCategories] = useState<string[]>([]);
  const [showCreationModal, setShowCreationModal] = useState(false);
  const [createdCategories, setCreatedCategories] = useState<Set<string>>(new Set());
  const [newCategoryInput, setNewCategoryInput] = useState('');

  // Generate categories based on upload type and data
  useEffect(() => {
    // Get all categories from images (including those in wikitext)
    const imageCategories = getAllCategoriesFromImages(images);
    
    // Get event-specific categories
    let eventCategories: string[] = [];
    if (uploadType === 'music' && musicEventData) {
      eventCategories = generateMusicCategories(musicEventData);
    } else if (uploadType === 'soccer' && soccerMatchData && selectedPlayers.length > 0) {
      eventCategories = generateSoccerCategories(soccerMatchData, selectedPlayers);
    }
    
    // Combine all categories and remove duplicates
    const combinedCategories = new Set([...imageCategories, ...eventCategories]);
    
    // Also add all categories that need creation (so they appear in the unified list)
    let toCreate: CategoryCreationInfo[] = [];
    if (uploadType === 'music' && musicEventData) {
      toCreate = getMusicCategoriesToCreate(musicEventData);
    } else if (uploadType === 'soccer' && soccerMatchData && selectedPlayers.length > 0) {
      toCreate = getSoccerCategoriesToCreate(soccerMatchData, selectedPlayers);
    }
    
    // Add categories that need creation to the unified list
    toCreate.forEach(cat => combinedCategories.add(cat.categoryName));
    
    setAllCategories(Array.from(combinedCategories).sort());
    setCategoriesToCreate(toCreate);
  }, [uploadType, musicEventData, soccerMatchData, selectedPlayers, images]);

  const handleCategoryCreated = (categoryName: string) => {
    setCreatedCategories(prev => new Set([...prev, categoryName]));
  };

  const handleAddCategory = () => {
    if (newCategoryInput.trim() && !allCategories.includes(newCategoryInput.trim())) {
      setAllCategories(prev => [...prev, newCategoryInput.trim()].sort());
      setNewCategoryInput('');
    }
  };

  const handleRemoveCategory = (categoryToRemove: string) => {
    setAllCategories(prev => prev.filter(cat => cat !== categoryToRemove));
  };

  const getCategoryStatus = (categoryName: string): 'created' | 'needs_creation' | 'unknown' => {
    if (createdCategories.has(categoryName)) {
      return 'created';
    }
    const categoryToCreate = categoriesToCreate.find(cat => cat.categoryName === categoryName);
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
    if (uploadType === 'soccer') {
      return soccerMatchData?.homeTeam?.name && soccerMatchData?.awayTeam?.name;
    }
    return false;
  };

  const pendingCategories = categoriesToCreate.filter(cat => !createdCategories.has(cat.categoryName));
  const allCategoriesCreated = categoriesToCreate.length > 0 && pendingCategories.length === 0;

  // Debug: Log the differences
  console.log('Debug Categories:');
  console.log('allCategories:', allCategories);
  console.log('categoriesToCreate:', categoriesToCreate.map(c => c.categoryName));
  console.log('pendingCategories:', pendingCategories.map(c => c.categoryName));

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
                <li>• Event Details: {(musicEventData?.festivalData?.festival?.name || musicEventData?.concertData?.concert?.artist?.name) ? '✅' : '❌'} Add event information</li>
              </>
            )}
            {uploadType === 'soccer' && (
              <>
                <li>• Match Details: {soccerMatchData?.homeTeam?.name && soccerMatchData?.awayTeam?.name ? '✅' : '❌'} Add team information</li>
                <li>• Players: {selectedPlayers.length > 0 ? '✅' : '❌'} Select players</li>
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
          <input
            type="text"
            value={newCategoryInput}
            onChange={(e) => setNewCategoryInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
            placeholder="Add new category"
            className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
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
            {allCategories.map((category, index) => {
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
        categoriesToCreate={pendingCategories}
        onCategoryCreated={handleCategoryCreated}
      />
    </div>
  );
}