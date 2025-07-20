'use client';

import { User, Music, MapPin } from 'lucide-react';
import { WikidataEntity } from '@/types/wikidata';
import { WDPersonUtils, WDMusicianUtils, WDSoccerPlayerUtils, getThumbnailUrl } from '@/utils/wd-utils';
import FocusedImage from '@/components/image/FocusedImage';

interface WDPersonCardCompactProps {
  entity: WikidataEntity;
  onClick?: (qid: string) => void;
  variant?: 'main' | 'additional' | 'new';
  selected?: boolean;
}

const variantStyles = {
  main: {
    background: 'bg-blue-50',
    border: 'border-blue-200',
    selectedBg: 'bg-blue-200',
    selectedBorder: 'border-blue-400',
    selectedText: 'text-blue-900'
  },
  additional: {
    background: 'bg-green-50',
    border: 'border-green-200',
    selectedBg: 'bg-green-200',
    selectedBorder: 'border-green-400',
    selectedText: 'text-green-900'
  },
  new: {
    background: 'bg-yellow-50',
    border: 'border-yellow-200',
    selectedBg: 'bg-yellow-200',
    selectedBorder: 'border-yellow-400',
    selectedText: 'text-yellow-900'
  }
};

export default function WDPersonCardCompact({
  entity,
  onClick,
  variant = 'main',
  selected = false
}: WDPersonCardCompactProps) {
  const styles = variantStyles[variant];
  
  // Extract data using WD utilities
  const name = WDPersonUtils.getName(entity);
  const imageUrl = WDPersonUtils.getImage(entity);
  
  // Get domain-specific info
  const instruments = WDMusicianUtils.getInstruments(entity);
  const positions = WDSoccerPlayerUtils.getPositions(entity);
  const isMusician = WDMusicianUtils.isMusician(entity);
  const isSoccerPlayer = WDSoccerPlayerUtils.isSoccerPlayer(entity);

  // Format domain-specific info for display
  const domainInfo = () => {
    if (isMusician && instruments.length > 0) {
      return instruments.map(id => id).join(', '); // TODO: Resolve Q-IDs to names
    }
    if (isSoccerPlayer && positions.length > 0) {
      return positions.map(id => id).join(', '); // TODO: Resolve Q-IDs to names
    }
    return null;
  };

  const info = domainInfo();
  
  return (
    <button
      onClick={() => onClick?.(entity.id)}
      className={`
        flex flex-col items-center p-2 rounded-lg border-2 transition-all text-xs w-full
        ${selected 
          ? `${styles.selectedBg} ${styles.selectedBorder} ${styles.selectedText} dark:bg-purple-800 dark:border-purple-500 dark:text-purple-100` 
          : `${styles.background} ${styles.border} text-gray-700 hover:opacity-80`
        }
      `}
    >
      {imageUrl ? (
        <FocusedImage
          src={getThumbnailUrl(imageUrl, 128)}
          alt={name}
          className="mb-1"
          size={32}
          onError={(e) => {
            console.log('🖼️ WD image failed to load:', imageUrl);
            e.currentTarget.style.display = 'none';
          }}
        />
      ) : (
        <User className={`w-4 h-4 mb-1 ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
      )}
      
      <div className="font-medium text-center leading-tight truncate w-full" title={name}>
        {name}
      </div>
      
      {info && (
        <div className="flex items-center gap-1 mt-1">
          {isMusician && <Music className="w-3 h-3" />}
          {isSoccerPlayer && <MapPin className="w-3 h-3" />}
          <div 
            className={`text-xs text-center truncate w-full ${selected ? 'text-blue-600 dark:text-blue-400' : 'text-gray-500'}`} 
            title={info}
          >
            {info}
          </div>
        </div>
      )}
    </button>
  );
}