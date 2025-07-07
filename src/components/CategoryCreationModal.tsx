'use client';

import { useState } from 'react';
import { X, Plus, Check, AlertTriangle, Loader } from 'lucide-react';
import { CategoryCreationInfo } from '@/utils/soccer-categories';

interface CategoryCreationModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryCreationInfo[];
  onCreateCategories: (categoriesToCreate: CategoryCreationInfo[]) => Promise<void>;
}

interface CategoryStatus {
  categoryName: string;
  status: 'pending' | 'creating' | 'success' | 'error' | 'exists';
  error?: string;
}

export default function CategoryCreationModal({
  isOpen,
  onClose,
  categories,
  onCreateCategories
}: CategoryCreationModalProps) {
  const [categoryStatuses, setCategoryStatuses] = useState<Record<string, CategoryStatus>>({});
  const [isCreating, setIsCreating] = useState(false);
  const [selectedCategories, setSelectedCategories] = useState<Set<string>>(
    new Set(categories.map(c => c.categoryName))
  );

  if (!isOpen) return null;

  const handleCategoryToggle = (categoryName: string) => {
    const newSelected = new Set(selectedCategories);
    if (newSelected.has(categoryName)) {
      newSelected.delete(categoryName);
    } else {
      newSelected.add(categoryName);
    }
    setSelectedCategories(newSelected);
  };

  const handleCreateSelected = async () => {
    setIsCreating(true);
    const categoriesToCreate = categories.filter(c => selectedCategories.has(c.categoryName));
    
    // Initialize statuses
    const initialStatuses: Record<string, CategoryStatus> = {};
    categoriesToCreate.forEach(category => {
      initialStatuses[category.categoryName] = {
        categoryName: category.categoryName,
        status: 'pending'
      };
    });
    setCategoryStatuses(initialStatuses);

    // Create categories one by one
    for (const category of categoriesToCreate) {
      setCategoryStatuses(prev => ({
        ...prev,
        [category.categoryName]: {
          ...prev[category.categoryName],
          status: 'creating'
        }
      }));

      try {
        const response = await fetch('/api/commons/create-category', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            categoryName: category.categoryName,
            parentCategory: category.parentCategory,
            description: category.description,
            teamName: category.teamName
          })
        });

        const result = await response.json();

        if (response.ok) {
          setCategoryStatuses(prev => ({
            ...prev,
            [category.categoryName]: {
              ...prev[category.categoryName],
              status: result.exists ? 'exists' : 'success'
            }
          }));
        } else {
          throw new Error(result.error || 'Failed to create category');
        }
      } catch (error) {
        setCategoryStatuses(prev => ({
          ...prev,
          [category.categoryName]: {
            ...prev[category.categoryName],
            status: 'error',
            error: error instanceof Error ? error.message : 'Unknown error'
          }
        }));
      }

      // Small delay between requests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 500));
    }

    setIsCreating(false);
    
    // Call the parent callback
    try {
      await onCreateCategories(categoriesToCreate);
    } catch (error) {
      console.error('Error in parent callback:', error);
    }
  };

  const getStatusIcon = (status: CategoryStatus['status']) => {
    switch (status) {
      case 'pending':
        return <div className="w-4 h-4 border border-gray-300 rounded"></div>;
      case 'creating':
        return <Loader className="w-4 h-4 animate-spin text-blue-500" />;
      case 'success':
        return <Check className="w-4 h-4 text-green-500" />;
      case 'exists':
        return <Check className="w-4 h-4 text-yellow-500" />;
      case 'error':
        return <AlertTriangle className="w-4 h-4 text-red-500" />;
      default:
        return null;
    }
  };

  const allCompleted = Object.values(categoryStatuses).length > 0 && 
    Object.values(categoryStatuses).every(s => s.status === 'success' || s.status === 'exists' || s.status === 'error');

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">
            Create Missing Categories
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
            disabled={isCreating}
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          <div className="mb-4">
            <p className="text-gray-600 mb-4">
              The following categories will help organize your soccer match photos. 
              Select which categories you'd like to create on Wikimedia Commons:
            </p>
          </div>

          <div className="space-y-3">
            {categories.map((category) => {
              const status = categoryStatuses[category.categoryName];
              const isSelected = selectedCategories.has(category.categoryName);
              
              return (
                <div
                  key={category.categoryName}
                  className={`border rounded-lg p-4 transition-colors ${
                    isSelected ? 'border-blue-300 bg-blue-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex items-center pt-1">
                      {status ? (
                        getStatusIcon(status.status)
                      ) : (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleCategoryToggle(category.categoryName)}
                          disabled={isCreating}
                          className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                        />
                      )}
                    </div>
                    
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">
                        Category:{category.categoryName}
                      </div>
                      
                      {category.description && (
                        <div className="text-sm text-gray-600 mt-1">
                          {category.description}
                        </div>
                      )}
                      
                      {category.parentCategory && (
                        <div className="text-xs text-gray-500 mt-1">
                          → Will be added to Category:{category.parentCategory}
                        </div>
                      )}
                      
                      {status?.status === 'error' && status.error && (
                        <div className="text-xs text-red-600 mt-1">
                          Error: {status.error}
                        </div>
                      )}
                      
                      {status?.status === 'exists' && (
                        <div className="text-xs text-yellow-600 mt-1">
                          Category already exists
                        </div>
                      )}
                      
                      {status?.status === 'success' && (
                        <div className="text-xs text-green-600 mt-1">
                          Category created successfully
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="border-t p-6">
          <div className="flex justify-between items-center">
            <div className="text-sm text-gray-600">
              {selectedCategories.size} of {categories.length} categories selected
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onClose}
                disabled={isCreating}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed"
              >
                {allCompleted ? 'Close' : 'Skip'}
              </button>
              
              {!allCompleted && (
                <button
                  onClick={handleCreateSelected}
                  disabled={isCreating || selectedCategories.size === 0}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {isCreating ? (
                    <>
                      <Loader className="w-4 h-4 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Create Selected</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}