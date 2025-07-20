'use client';

import { WikidataEntity } from '@/types/wikidata';
import { WDOrganizationUtils } from '@/utils/wd-utils';
import { Users, Building, Trophy, Music, Globe, MapPin, X, Calendar } from 'lucide-react';

interface WDOrganizationCardProps {
  entity: WikidataEntity;
  variant?: 'main' | 'additional' | 'new';
  onRemove?: (qid: string) => void;
  onClick?: (qid: string) => void;
  className?: string;
}

export default function WDOrganizationCard({
  entity,
  variant = 'main',
  onRemove,
  onClick,
  className = ''
}: WDOrganizationCardProps) {
  const name = WDOrganizationUtils.getName(entity);
  const description = WDOrganizationUtils.getDescription(entity);
  const country = WDOrganizationUtils.getCountry(entity);
  const foundingDate = WDOrganizationUtils.getFoundingDate(entity);
  const organizationType = WDOrganizationUtils.getOrganizationType(entity);
  const wikipediaUrl = WDOrganizationUtils.getWikipediaUrl(entity);
  const wikidataUrl = `https://www.wikidata.org/wiki/${entity.id}`;

  const getIcon = () => {
    switch (organizationType) {
      case 'band':
      case 'musical_group':
        return <Music className="w-5 h-5 text-blue-600" />;
      case 'football_club':
      case 'sports_club':
        return <Trophy className="w-5 h-5 text-green-600" />;
      case 'company':
      case 'organization':
        return <Building className="w-5 h-5 text-purple-600" />;
      default:
        return <Users className="w-5 h-5 text-gray-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (organizationType) {
      case 'band':
      case 'musical_group':
        return 'Band';
      case 'football_club':
        return 'Football Club';
      case 'sports_club':
        return 'Sports Club';
      case 'company':
        return 'Company';
      case 'organization':
        return 'Organization';
      default:
        return 'Organization';
    }
  };

  const getVariantStyles = () => {
    switch (variant) {
      case 'main':
        return 'border-blue-200 bg-blue-50';
      case 'additional':
        return 'border-green-200 bg-green-50';
      case 'new':
        return 'border-yellow-200 bg-yellow-50';
      default:
        return 'border-gray-200 bg-white';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(entity.id);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(entity.id);
    }
  };

  return (
    <div
      className={`border rounded-lg p-4 shadow-sm transition-all hover:shadow-md ${getVariantStyles()} ${
        onClick ? 'cursor-pointer hover:scale-[1.02]' : ''
      } ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            {getIcon()}
            <h3 className="font-semibold text-gray-900">{name}</h3>
            <span className="px-2 py-1 text-xs bg-white bg-opacity-70 rounded-full border">
              {getTypeLabel()}
            </span>
            {variant === 'new' && (
              <span className="px-2 py-1 text-xs bg-yellow-200 text-yellow-800 rounded-full">
                New
              </span>
            )}
          </div>
          
          {description && (
            <p className="text-sm text-gray-600 mb-2">{description}</p>
          )}
          
          <div className="flex items-center gap-4 text-sm text-gray-600">
            {country && (
              <div className="flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>{country}</span>
              </div>
            )}
            
            {foundingDate && (
              <div className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                <span>{foundingDate}</span>
              </div>
            )}
            
            {wikidataUrl && (
              <a
                href={wikidataUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 text-blue-600 hover:text-blue-800 transition-colors"
                onClick={(e) => e.stopPropagation()}
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
                className="flex items-center gap-1 text-green-600 hover:text-green-800 transition-colors"
                onClick={(e) => e.stopPropagation()}
              >
                <Globe className="w-3 h-3" />
                <span>Wikipedia</span>
              </a>
            )}
          </div>
          
          {/* Entity ID for debugging */}
          <div className="text-xs text-gray-400 mt-2">
            {entity.id}
          </div>
        </div>
        
        {onRemove && (
          <button
            onClick={handleRemove}
            className="ml-3 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
            title="Remove organization"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>
    </div>
  );
}

// Compact version for selection lists
export function WDOrganizationCardCompact({
  entity,
  variant = 'main',
  selected = false,
  onRemove,
  onClick,
  className = ''
}: WDOrganizationCardProps & { selected?: boolean }) {
  const name = WDOrganizationUtils.getName(entity);
  const description = WDOrganizationUtils.getDescription(entity);
  const organizationType = WDOrganizationUtils.getOrganizationType(entity);

  const getIcon = () => {
    switch (organizationType) {
      case 'band':
      case 'musical_group':
        return <Music className="w-4 h-4 text-blue-600" />;
      case 'football_club':
      case 'sports_club':
        return <Trophy className="w-4 h-4 text-green-600" />;
      case 'company':
      case 'organization':
        return <Building className="w-4 h-4 text-purple-600" />;
      default:
        return <Users className="w-4 h-4 text-gray-600" />;
    }
  };

  const getTypeLabel = () => {
    switch (organizationType) {
      case 'band':
      case 'musical_group':
        return 'Band';
      case 'football_club':
        return 'Club';
      case 'sports_club':
        return 'Sports';
      case 'company':
        return 'Company';
      default:
        return 'Org';
    }
  };

  const handleClick = () => {
    if (onClick) {
      onClick(entity.id);
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (onRemove) {
      onRemove(entity.id);
    }
  };

  return (
    <div
      className={`border rounded-lg p-3 transition-all hover:shadow-sm ${
        selected 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-200 bg-white hover:border-gray-300'
      } ${
        onClick ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={handleClick}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 flex-1 min-w-0">
          {getIcon()}
          <div className="flex-1 min-w-0">
            <h4 className="font-medium text-gray-900 truncate">{name}</h4>
            {description && (
              <p className="text-xs text-gray-500 truncate">{description}</p>
            )}
          </div>
          <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded-full flex-shrink-0">
            {getTypeLabel()}
          </span>
        </div>
        
        {onRemove && (
          <button
            onClick={handleRemove}
            className="ml-2 p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors flex-shrink-0"
            title="Remove organization"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
}