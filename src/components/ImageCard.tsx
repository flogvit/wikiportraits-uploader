'use client';

import { useState } from 'react';
import { X, ChevronDown, ChevronUp, RotateCcw } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { MusicEventMetadata } from '@/types/music';
import CommonsPreview from './CommonsPreview';
import { generateFilename, updateImageWikitext, regenerateImageWikitext } from '@/utils/commons-template';
import { extractCategoriesFromWikitext } from '@/utils/category-extractor';

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
    // Update the metadata
    onUpdate(image.id, { [field]: value });
    
    // If wikitext hasn't been manually modified, regenerate it automatically
    if (!image.metadata.wikitextModified) {
      // Key fields that should trigger wikitext regeneration
      const wikitextFields = ['description', 'author', 'date', 'time', 'source', 'license', 'categories', 'selectedBand', 'template'];
      if (wikitextFields.includes(field as string)) {
        // Regenerate wikitext after a short delay to allow the metadata update to complete
        setTimeout(() => {
          const updatedImage = { ...image, metadata: { ...image.metadata, [field]: value } };
          const newWikitext = regenerateImageWikitext(updatedImage);
          onUpdate(image.id, { wikitext: newWikitext.metadata.wikitext, wikitextModified: false });
        }, 100);
      }
    }
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

  const handleWikitextChange = (wikitext: string) => {
    const updatedImage = updateImageWikitext(image, wikitext, true);
    
    // Extract categories from wikitext and sync with metadata
    const wikitextCategories = extractCategoriesFromWikitext(wikitext);
    const existingCategories = new Set(image.metadata.categories);
    
    // Add any new categories found in wikitext
    wikitextCategories.forEach(cat => {
      if (cat.trim() && !existingCategories.has(cat.trim())) {
        existingCategories.add(cat.trim());
      }
    });
    
    // Update both wikitext and categories
    onUpdate(image.id, {
      ...updatedImage.metadata,
      categories: Array.from(existingCategories)
    });
  };

  const regenerateWikitext = () => {
    const updatedImage = regenerateImageWikitext(image);
    onUpdate(image.id, updatedImage.metadata);
  };

  const handleTemplateChange = (template: string) => {
    onUpdate(image.id, { template, templateModified: true });
    
    // Auto-regenerate wikitext if it hasn't been manually modified
    if (!image.metadata.wikitextModified) {
      setTimeout(() => {
        const updatedImage = { ...image, metadata: { ...image.metadata, template, templateModified: true } };
        const newWikitext = regenerateImageWikitext(updatedImage);
        onUpdate(image.id, { wikitext: newWikitext.metadata.wikitext, wikitextModified: false });
      }, 100);
    }
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
    <div id={`image-card-${image.id}`} className="bg-card rounded-lg shadow-lg overflow-hidden">
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
          className="absolute top-2 right-2 p-1 bg-destructive text-destructive-foreground rounded-full hover:bg-destructive/90 transition-colors"
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
          <h3 className="font-semibold text-card-foreground truncate">
            {generateFilename(image, index)}
          </h3>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="flex items-center text-sm text-muted-foreground hover:text-foreground"
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
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Description *
              </label>
              <textarea
                value={String(image.metadata.description || '')}
                onChange={(e) => handleMetadataChange('description', e.target.value)}
                placeholder="Describe the portrait (e.g., 'Portrait of John Doe at WikiConference 2025')"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={String(image.metadata.authorUsername || '')}
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
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  value={String(image.metadata.authorFullName || '')}
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
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              </div>
            </div>
          
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Date {!!image.metadata.dateFromExif && <span className="text-xs text-green-600">(from EXIF)</span>}
                  </label>
                  <input
                    type="date"
                    value={String(image.metadata.date || '')}
                    onChange={(e) => {
                      handleMetadataChange('date', e.target.value);
                      handleMetadataChange('dateFromExif', false); // Mark as manually edited
                    }}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                  />
                  {!!image.metadata.dateFromExif && (
                    <p className="text-xs text-green-600 mt-1">
                      📷 From EXIF data
                    </p>
                  )}
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-card-foreground mb-1">
                    Time {!!image.metadata.dateFromExif && !!image.metadata.time && <span className="text-xs text-green-600">(from EXIF)</span>}
                  </label>
                  <input
                    type="time"
                    step="1"
                    value={String(image.metadata.time || '')}
                    onChange={(e) => {
                      handleMetadataChange('time', e.target.value);
                      if (image.metadata.dateFromExif) {
                        handleMetadataChange('dateFromExif', false); // Mark as manually edited
                      }
                    }}
                    className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                    placeholder="HH:MM:SS"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Source
                </label>
                <input
                  type="text"
                  value={String(image.metadata.source || '')}
                  onChange={(e) => handleMetadataChange('source', e.target.value)}
                  placeholder="own work"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                License
              </label>
              <select
                value={String(image.metadata.license || '')}
                onChange={(e) => handleMetadataChange('license', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
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
                <label className="block text-sm font-medium text-card-foreground mb-1">
                  Band/Artist
                </label>
                <input
                  type="text"
                  value={String(image.metadata.selectedBand || '')}
                  onChange={(e) => handleMetadataChange('selectedBand', e.target.value)}
                  placeholder="Band or artist name"
                  className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-card-foreground mb-1">
                Categories
              </label>
              <div className="flex space-x-2">
                <input
                  type="text"
                  value={categoryInput}
                  onChange={(e) => setCategoryInput(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addCategory()}
                  placeholder="Add category"
                  className="flex-1 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card"
                />
                <button
                  onClick={addCategory}
                  className="px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  Add
                </button>
              </div>
              <div className="mt-2 flex flex-wrap gap-1">
                {image.metadata.categories.map((category, index) => (
                  <span
                    key={index}
                    className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-primary/10 text-primary"
                  >
                    {category}
                    <button
                      onClick={() => removeCategory(category)}
                      className="ml-1 text-muted-foreground hover:text-foreground"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            </div>

            {/* Template Editor */}
            <div className="pt-4 border-t border-border">
              <label className="block text-sm font-medium text-card-foreground mb-1">
                WikiPortraits Template
                {image.metadata.templateModified && (
                  <span className="text-xs text-orange-500 ml-1">(modified)</span>
                )}
              </label>
              <input
                type="text"
                value={String(image.metadata.template || '')}
                onChange={(e) => handleTemplateChange(e.target.value)}
                placeholder="e.g. WikiPortraits Event Name (leave empty for no template)"
                className="w-full px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground mt-1">
                The template to include in the wikitext (without curly braces). Leave empty to remove template.
              </p>
            </div>

            {/* Wikitext Editor */}
            <div className="pt-4 border-t border-border">
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-card-foreground">
                  Commons Wikitext
                  {image.metadata.wikitextModified && (
                    <span className="text-xs text-orange-500 ml-1">(modified)</span>
                  )}
                </label>
                <button
                  onClick={regenerateWikitext}
                  className="flex items-center space-x-1 text-xs text-primary hover:text-primary/80"
                  title="Regenerate wikitext from current metadata"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Regenerate</span>
                </button>
              </div>
              <textarea
                value={String(image.metadata.wikitext || '')}
                onChange={(e) => handleWikitextChange(e.target.value)}
                className="w-full h-32 px-3 py-2 border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary text-card-foreground bg-card font-mono text-sm resize-y"
                placeholder="Wikitext will be generated automatically..."
              />
              <p className="text-xs text-muted-foreground mt-1">
                This is the complete wikitext that will be used for the Commons file page. You can edit it directly.
              </p>
            </div>

            <div className="pt-4 border-t border-border">
              <CommonsPreview image={image} index={index} />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}