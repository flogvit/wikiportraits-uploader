'use client';

import { X, User, Music, Calendar, Globe, UserPlus, MapPin } from 'lucide-react';
import { WikidataEntity } from '@/types/wikidata';
import { WDPersonUtils, WDMusicianUtils, WDSoccerPlayerUtils, getThumbnailUrl } from '@/utils/wd-utils';
import FocusedImage from '@/components/image/FocusedImage';
import { logger } from '@/utils/logger';

interface WDPersonCardProps {
  entity: WikidataEntity;
  onRemove?: (qid: string) => void;
  onClick?: (qid: string) => void;
  variant?: 'main' | 'additional' | 'new';
  showRemove?: boolean;
  selected?: boolean;
}

const variantStyles = {
  main: {
    background: 'bg-blue-50',
    border: 'border-blue-200',
    removeButton: 'text-blue-600 hover:text-blue-800',
    icon: User,
    label: 'Main',
    labelColor: 'bg-blue-100 text-blue-800'
  },
  additional: {
    background: 'bg-green-50',
    border: 'border-green-200',
    removeButton: 'text-green-600 hover:text-green-800',
    icon: User,
    label: 'Additional',
    labelColor: 'bg-green-100 text-green-800'
  },
  new: {
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    removeButton: 'text-yellow-600 hover:text-yellow-800',
    icon: UserPlus,
    label: 'New',
    labelColor: 'bg-yellow-100 text-yellow-800'
  }
};

export default function WDPersonCard({
  entity,
  onRemove,
  onClick,
  variant = 'main',
  showRemove = true,
  selected = false
}: WDPersonCardProps) {
  const styles = variantStyles[variant];
  const IconComponent = styles.icon;

  // Extract data using WD utilities
  const name = WDPersonUtils.getName(entity);
  const description = WDPersonUtils.getDescription(entity);
  const imageUrl = WDPersonUtils.getImage(entity);
  const birthDate = WDPersonUtils.getBirthDate(entity);
  const nationality = WDPersonUtils.getNationality(entity);
  const age = WDPersonUtils.getAge(entity);
  const wikipediaUrl = WDPersonUtils.getWikipediaUrl(entity);
  const wikidataUrl = WDPersonUtils.getWikidataUrl(entity);

  // Get domain-specific info
  const instruments = WDMusicianUtils.getInstruments(entity);
  const positions = WDSoccerPlayerUtils.getPositions(entity);
  const isMusician = WDMusicianUtils.isMusician(entity);
  const isSoccerPlayer = WDSoccerPlayerUtils.isSoccerPlayer(entity);

  // Format birth date for display
  const formattedBirthYear = birthDate ? new Date(birthDate).getFullYear() : null;

  return (
    <div className={`p-4 ${styles.border} ${styles.background} rounded-lg relative`}>
      {showRemove && onRemove && (
        <button
          onClick={() => onRemove(entity.id)}
          className={`absolute top-2 right-2 ${styles.removeButton} p-1 z-10`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
      
      <div className="flex items-start justify-between pr-8">
        <div className="flex-1 space-y-2">
          <div className="flex items-center gap-2">
            <IconComponent className={`w-4 h-4 ${variant === 'new' ? 'text-yellow-600' : 'text-gray-400'}`} />
            <h3 className="font-medium text-gray-900">{name}</h3>
          </div>
          
          {description && (
            <p className="text-sm text-gray-600">{description}</p>
          )}
          
          {/* Domain-specific information */}
          <div className="flex items-center gap-1">
            {isMusician && instruments.length > 0 && (
              <>
                <Music className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {instruments.map(id => id).join(', ')} {/* TODO: Resolve Q-IDs to names */}
                </span>
              </>
            )}
            {isSoccerPlayer && positions.length > 0 && (
              <>
                <MapPin className="w-3 h-3 text-gray-400" />
                <span className="text-sm text-gray-600">
                  {positions.map(id => id).join(', ')} {/* TODO: Resolve Q-IDs to names */}
                </span>
              </>
            )}
            {!isMusician && !isSoccerPlayer && (
              <span className="text-sm text-gray-600">&nbsp;</span>
            )}
          </div>
          
          <div className="flex items-center gap-4 text-xs text-gray-500">
            {formattedBirthYear && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{formattedBirthYear}</span>
                {age && <span>({age} years)</span>}
              </div>
            )}
            
            {/* TODO: Resolve Q-ID to country name */}
            {nationality && (
              <span>{nationality}</span>
            )}
            
            <div className="flex items-center gap-2">
              {wikidataUrl && (
                <a
                  href={wikidataUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-800"
                >
                  <Globe className="w-3 h-3" />
                  <span>Wikidata</span>
                </a>
              )}
              
              {wikipediaUrl && (
                <a
                  href={wikipediaUrl}
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
        
        {imageUrl && (
          <FocusedImage
            src={getThumbnailUrl(imageUrl, 192)}
            alt={name}
            className="ml-3"
            size={48}
            onError={(e) => {
              logger.debug('WDPersonCard', 'WD image failed to load', imageUrl);
              e.currentTarget.style.display = 'none';
            }}
          />
        )}
      </div>
      
      <span className={`absolute bottom-2 right-2 px-2 py-1 text-xs rounded-full ${styles.labelColor}`}>
        {styles.label}
      </span>
    </div>
  );
}