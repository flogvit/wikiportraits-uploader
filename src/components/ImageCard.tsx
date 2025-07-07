'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { MusicEventMetadata } from '@/types/music';
import CommonsPreview from './CommonsPreview';
import { generateFilename } from '@/utils/commons-template';

interface ImageCardProps {
  image: ImageFile;
  index: number;
  onUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  onRemove: (id: string) => void;
  onImageClick: (image: ImageFile) => void;
  musicEventData?: MusicEventMetadata;
}

const LICENSE_OPTIONS = [
  { value: 'CC-BY-SA-4.0', label: 'CC BY-SA 4.0' },
  { value: 'CC-BY-4.0', label: 'CC BY 4.0' },
  { value: 'CC-BY-SA-3.0', label: 'CC BY-SA 3.0' },
  { value: 'CC-BY-3.0', label: 'CC BY 3.0' },
  { value: 'CC0', label: 'CC0 (Public Domain)' }
];

export default function ImageCard({ image, index, onUpdate, onRemove, onImageClick, musicEventData }: ImageCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [categoryInput, setCategoryInput] = useState('');

  const handleMetadataChange = (field: keyof ImageFile['metadata'], value: string | string[]) => {
    onUpdate(image.id, { [field]: value });
  };

  const addCategory = () => {
    if (categoryInput.trim() && !image.metadata.categories.includes(categoryInput.trim())) {
      const newCategories = [...image.metadata.categories, categoryInput.trim()];
      handleMetadataChange('categories', newCategories);
      setCategoryInput('');
    }
  };

  const removeCategory = (category: string) => {
    const newCategories = image.metadata.categories.filter(cat => cat !== category);
    handleMetadataChange('categories', newCategories);
  };

  const isComplete = () => {
    const { description, author, selectedBand } = image.metadata;
    const hasBasicInfo = description.trim() && author.trim();
    
    // For music events, also require a selected band
    if (musicEventData?.eventType === 'festival') {
      return hasBasicInfo && selectedBand?.trim();
    }
    
    return hasBasicInfo;
  };

  return (
    <div id={`image-card-${image.id}`} className="bg-white rounded-lg shadow-lg overflow-hidden">
      <div className="relative">
        <img
          src={image.preview}
          alt="Preview"
          className="w-full h-64 object-cover cursor-pointer hover:opacity-90 transition-opacity"
          onClick={() => onImageClick(image)}
          title="Click to view full image"
        />
        <button
          onClick={() => onRemove(image.id)}
          className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
        <div className={`absolute top-2 left-2 px-2 py-1 rounded text-xs font-medium ${
          isComplete() ? 'bg-green-500 text-white' : 'bg-yellow-500 text-white'
        }`}>
          {isComplete() ? 'Ready' : 'Incomplete'}
        </div>
      </div>

      <div className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-900 truncate">
            {generateFilename(image, index)}
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-gray-500 hover:text-gray-700"
          >
            {isExpanded ? (
              <>
                <span>Collapse</span>
                <ChevronUp className="w-4 h-4 ml-1" />
              </>
            ) : (
              <>
                <span>Expand</span>
                <ChevronDown className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>

        {isExpanded && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Description *
              </label>
              <textarea
                value={image.metadata.description}
                onChange={(e) => handleMetadataChange('description', e.target.value)}
                placeholder="Describe the portrait (e.g., 'Portrait of John Doe at WikiConference 2025')"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={image.metadata.authorUsername || ''}
                  onChange={(e) => {
                    const username = e.target.value;
                    const fullName = image.metadata.authorFullName || '';
                    let formattedAuthor = '';
                    if (username && fullName) {
                      formattedAuthor = `[[User:${username}|${fullName}]]`;
                    } else if (fullName) {
                      formattedAuthor = fullName;
                    } else if (username) {
                      formattedAuthor = `[[User:${username}]]`;
                    }
                    handleMetadataChange('authorUsername', username);
                    handleMetadataChange('author', formattedAuthor);
                  }}
                  placeholder="YourUsername"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={image.metadata.authorFullName || ''}
                  onChange={(e) => {
                    const fullName = e.target.value;
                    const username = image.metadata.authorUsername || '';
                    let formattedAuthor = '';
                    if (username && fullName) {
                      formattedAuthor = `[[User:${username}|${fullName}]]`;
                    } else if (fullName) {
                      formattedAuthor = fullName;
                    } else if (username) {
                      formattedAuthor = `[[User:${username}]]`;
                    }
                    handleMetadataChange('authorFullName', fullName);
                    handleMetadataChange('author', formattedAuthor);
                  }}
                  placeholder="Your Full Name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>
          
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date {image.metadata.dateFromExif && <span className="text-xs text-green-600">(from EXIF)</span>}
                </label>
                <input
                  type="date"
                  value={image.metadata.date}
                  onChange={(e) => {
                    handleMetadataChange('date', e.target.value);
                    handleMetadataChange('dateFromExif', false); // Mark as manually edited
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
                {image.metadata.dateFromExif && (
                  <p className="text-xs text-green-600 mt-1">
                    📷 From EXIF data
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time {image.metadata.dateFromExif && image.metadata.time && <span className="text-xs text-green-600">(from EXIF)</span>}
                </label>
                <input
                  type="time"
                  step="1"
                  value={image.metadata.time || ''}
                  onChange={(e) => {
                    handleMetadataChange('time', e.target.value);
                    if (image.metadata.dateFromExif) {
                      handleMetadataChange('dateFromExif', false); // Mark as manually edited
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  placeholder="HH:MM:SS"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Source
                </label>
                <input
                  type="text"
                  value={image.metadata.source}
                  onChange={(e) => handleMetadataChange('source', e.target.value)}
                  placeholder="own work"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                License
              </label>
              <select
                value={image.metadata.license}
                onChange={(e) => handleMetadataChange('license', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              >
                {LICENSE_OPTIONS.map(option => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            {musicEventData?.eventType === 'festival' && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Band/Artist
                </label>
                <input
                  type="text"
                  value={image.metadata.selectedBand || ''}
                  onChange={(e) => handleMetadataChange('selectedBand', e.target.value)}
                  placeholder="Band or artist name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Categories
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  placeholder="Add category"
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                />
                <button
                  onClick={addCategory}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {image.metadata.categories.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800"
                  >
                    {category}
                    <button
                      onClick={() => removeCategory(category)}
                      className="ml-1 text-gray-500 hover:text-gray-700"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-200">
              <CommonsPreview image={image} index={index} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}