'use client';

import { X, User, Music, Calendar, Globe, UserPlus } from 'lucide-react';
import { BandMember } from '@/types/music';
import FocusedImage from '@/components/image/FocusedImage';

// Helper function to convert image URLs to thumbnail size
const getThumbnailUrl = (imageUrl: string, size: number = 64): string => {
  if (!imageUrl) return '';
  
  console.log('🔗 getThumbnailUrl - original:', imageUrl);
  
  // Handle Wikimedia Commons Special:FilePath URLs - these support width parameters
  if (imageUrl.includes('commons.wikimedia.org/wiki/Special:FilePath/')) {
    const thumbnailUrl = `${imageUrl}?width=${size}`;
    console.log('🔗 getThumbnailUrl - Special:FilePath with width:', thumbnailUrl);
    return thumbnailUrl;
  }
  
  // Handle direct Wikimedia Commons URLs
  if (imageUrl.includes('commons.wikimedia.org') || imageUrl.includes('upload.wikimedia.org')) {
    // Convert to thumbnail format: replace /commons/... with /commons/thumb/.../64px-filename
    const match = imageUrl.match(/\/commons\/([^\/]+)\/([^\/]+)\/([^\/]+)$/);
    if (match) {
      const [, level1, level2, filename] = match;
      const thumbnailUrl = `https://upload.wikimedia.org/wikipedia/commons/thumb/${level1}/${level2}/${filename}/${size}px-${filename}`;
      console.log('🔗 getThumbnailUrl - direct commons converted:', thumbnailUrl);
      return thumbnailUrl;
    }
  }
  
  // For other URLs, return as-is (could be extended for other services)
  console.log('🔗 getThumbnailUrl - returning as-is:', imageUrl);
  return imageUrl;
};

interface PerformerCardProps {
  performer: BandMember;
  onRemove?: (id: string) => void;
  onClick?: (id: string) => void;
  variant?: 'band' | 'additional' | 'new';
  showRemove?: boolean;
  compact?: boolean;
  selected?: boolean;
}

const variantStyles = {
  band: {
    background: 'bg-blue-50',
    border: 'border-blue-200',
    removeButton: 'text-blue-600 hover:text-blue-800',
    icon: User,
    label: 'Band Member',
    labelColor: 'bg-blue-100 text-blue-800'
  },
  additional: {
    background: 'bg-green-50',
    border: 'border-green-200',
    removeButton: 'text-green-600 hover:text-green-800',
    icon: User,
    label: 'Additional Artist',
    labelColor: 'bg-green-100 text-green-800'
  },
  new: {
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    removeButton: 'text-yellow-600 hover:text-yellow-800',
    icon: UserPlus,
    label: 'New Artist',
    labelColor: 'bg-yellow-100 text-yellow-800'
  }
};

export default function PerformerCard({
  performer,
  onRemove,
  onClick,
  variant = 'band',
  showRemove = true,
  compact = false,
  selected = false
}: PerformerCardProps) {
  const styles = variantStyles[variant];
  const IconComponent = styles.icon;

  if (compact) {
    return (
      <button
        onClick={() => onClick?.(performer.id)}
        className={`
          flex flex-col items-center p-2 rounded-lg border-2 transition-all text-xs w-full
          ${selected 
            ? 'bg-purple-200 border-purple-400 text-purple-900 dark:bg-purple-800 dark:border-purple-500 dark:text-purple-100' 
            : `${styles.background} ${styles.border} text-gray-700 hover:opacity-80`
          }
        `}
      >
        {performer.imageUrl ? (
          <FocusedImage
            src={getThumbnailUrl(performer.imageUrl, 128)}
            alt={performer.name}
            className="mb-1"
            size={32}
            onError={(e) => {
              console.log('🖼️ Image failed to load:', performer.imageUrl);
              console.log('🖼️ Thumbnail URL:', getThumbnailUrl(performer.imageUrl, 128));
              e.currentTarget.style.display = 'none';
            }}
          />
        ) : (
          <User className={`w-4 h-4 mb-1 ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
        )}
        <div className="font-medium text-center leading-tight truncate w-full" title={performer.name}>
          {performer.name}
        </div>
        {performer.instruments && performer.instruments.length > 0 && (
          <div className={`text-xs mt-1 text-center truncate w-full ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} title={performer.instruments.join(', ')}>
            {performer.instruments.join(', ')}
          </div>
        )}
      </button>
    );
  }

  return (
    <div className={`p-4 ${styles.border} ${styles.background} rounded-lg relative`}>
      {showRemove && onRemove && (
        <button
          onClick={() => onRemove(performer.id)}
          className={`absolute top-2 right-2 ${styles.removeButton} p-1 z-10`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      <div className="flex items-start justify-between pr-8">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-4 h-4 ${variant === 'new' ? 'text-yellow-600' : 'text-gray-400'}`} />
            <h3 className="font-medium text-gray-900">{performer.name}</h3>
          </div>
          
          <div className="flex items-center gap-1">
            {performer.instruments && performer.instruments.length > 0 ? (
              <>
                <Music className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {performer.instruments.join(', ')}
                </span>
              </>
            ) : (
              <span className="text-sm text-gray-600">&nbsp;</span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {performer.birthDate && !performer.birthDate.includes('NaN') && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{new Date(performer.birthDate).getFullYear()}</span>
              </div>
            )}
            
            {performer.nationality && !performer.nationality.startsWith('Q') && (
              <span>{performer.nationality}</span>
            )}
            
            <div className="flex items-center gap-2">
              {performer.wikidataUrl && (
                <a
                  href={performer.wikidataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Globe className="w-3 h-3" />
                  <span>Wikidata</span>
                </a>
              )}
              
              {performer.wikipediaUrl && (
                <a
                  href={performer.wikipediaUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-green-600 hover:text-green-800"
                >
                  <Globe className="w-3 h-3" />
                  <span>Wikipedia</span>
                </a>
              )}
            </div>
          </div>
        </div>
        
        {performer.imageUrl && (
          <FocusedImage
            src={getThumbnailUrl(performer.imageUrl, 192)}
            alt={performer.name}
            className="ml-3"
            size={48}
          />
        )}
      </div>
      
      <span className={`absolute bottom-2 right-2 px-2 py-1 text-xs rounded-full ${styles.labelColor}`}>
        {styles.label}
      </span>
    </div>
  );
}