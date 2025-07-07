'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp } from 'lucide-react';
import { ImageFile } from '@/app/page';
import CommonsPreview from './CommonsPreview';

interface ImageCardProps {
  image: ImageFile;
  onUpdate: (id: string, metadata: Partial<ImageFile['metadata']>) => void;
  onRemove: (id: string) => void;
  onImageClick: (image: ImageFile) => void;
}

const LICENSE_OPTIONS = [
  { value: 'CC-BY-SA-4.0', label: 'CC BY-SA 4.0' },
  { value: 'CC-BY-4.0', label: 'CC BY 4.0' },
  { value: 'CC-BY-SA-3.0', label: 'CC BY-SA 3.0' },
  { value: 'CC-BY-3.0', label: 'CC BY 3.0' },
  { value: 'CC0', label: 'CC0 (Public Domain)' }
];

const WIKI_PORTRAITS_EVENTS = [
  'WikiConference North America 2025',
  'TED2025',
  'Sundance Film Festival 2025',
  'SXSW 2025',
  'Wikimania 2024',
  'Other'
];

export default function ImageCard({ image, onUpdate, onRemove, onImageClick }: ImageCardProps) {
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
    const { description, author, wikiPortraitsEvent } = image.metadata;
    return description.trim() && author.trim() && wikiPortraitsEvent.trim();
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
            {image.file.name}
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
                Author *
              </label>
              <input
                type="text"
                value={image.metadata.author}
                onChange={(e) => handleMetadataChange('author', e.target.value)}
                placeholder="Photographer name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={image.metadata.date}
                onChange={(e) => handleMetadataChange('date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              WikiPortraits Event *
            </label>
            <select
              value={image.metadata.wikiPortraitsEvent}
              onChange={(e) => handleMetadataChange('wikiPortraitsEvent', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
            >
              <option value="">Select event...</option>
              {WIKI_PORTRAITS_EVENTS.map(event => (
                <option key={event} value={event}>
                  {event}
                </option>
              ))}
            </select>
          </div>

          {isExpanded && (
            <>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Source
                  </label>
                  <input
                    type="text"
                    value={image.metadata.source}
                    onChange={(e) => handleMetadataChange('source', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-gray-900 bg-white"
                  />
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
                    {LICENSE_OPTIONS.map(license => (
                      <option key={license.value} value={license.value}>
                        {license.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Additional Categories
                </label>
                <div className="flex space-x-2 mb-2">
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
                    className="px-4 py-2 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                  >
                    Add
                  </button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {image.metadata.categories.map(category => (
                    <span
                      key={category}
                      className="inline-flex items-center px-2 py-1 bg-gray-100 text-gray-800 text-sm rounded-md"
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
                <CommonsPreview image={image} />
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}