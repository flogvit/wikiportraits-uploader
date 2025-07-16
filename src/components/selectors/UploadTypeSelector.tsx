'use client';

import { useState } from 'react';
import { Camera, Music, Users, FileImage } from 'lucide-react';
import { UploadType } from '@/types/upload';

interface UploadTypeSelectorProps {
  onTypeSelect: (type: UploadType) => void;
  selectedType?: UploadType;
}

const uploadTypes = [
  {
    id: 'general' as UploadType,
    title: 'General Upload',
    description: 'Standard WikiPortraits upload with basic metadata',
    icon: FileImage,
    color: 'bg-muted hover:bg-muted/80 border-border',
    disabled: true
  },
  {
    id: 'soccer' as UploadType,
    title: 'Soccer Match',
    description: 'Upload players from a soccer match with team tagging',
    icon: Users,
    color: 'bg-success/20 hover:bg-success/30 border-success/40',
    disabled: true
  },
  {
    id: 'music' as UploadType,
    title: 'Music Event',
    description: 'Upload musicians and performers from an event',
    icon: Music,
    color: 'bg-accent hover:bg-accent/80 border-accent/40',
    disabled: false
  },
  {
    id: 'portraits' as UploadType,
    title: 'Portrait Session',
    description: 'Upload portrait photos with enhanced metadata',
    icon: Camera,
    color: 'bg-primary/20 hover:bg-primary/30 border-primary/40',
    disabled: true
  }
];

export default function UploadTypeSelector({ onTypeSelect, selectedType }: UploadTypeSelectorProps) {
  const [selected, setSelected] = useState<UploadType | undefined>(selectedType);

  const handleSelect = (type: UploadType, disabled: boolean) => {
    if (disabled) return;
    setSelected(type);
    onTypeSelect(type);
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Choose Upload Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {uploadTypes.map((type) => {
          const Icon = type.icon;
          const isSelected = selected === type.id;
          const isDisabled = type.disabled;
          
          return (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id, isDisabled)}
              disabled={isDisabled}
              className={`
                p-6 rounded-lg border-2 transition-all duration-200 text-left
                ${isDisabled 
                  ? 'opacity-50 cursor-not-allowed bg-gray-100 border-gray-300' 
                  : isSelected 
                    ? 'border-primary bg-primary/10 shadow-md' 
                    : `${type.color} shadow-sm hover:shadow-md`
                }
              `}
            >
              <div className="flex items-center mb-3">
                <Icon 
                  className={`w-8 h-8 ${
                    isDisabled 
                      ? 'text-gray-400' 
                      : isSelected 
                        ? 'text-primary' 
                        : 'text-muted-foreground'
                  }`} 
                />
                {isSelected && !isDisabled && (
                  <div className="ml-auto w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
                {isDisabled && (
                  <div className="ml-auto text-xs text-gray-500 font-medium">
                    Coming Soon
                  </div>
                )}
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${
                isDisabled 
                  ? 'text-gray-500' 
                  : isSelected 
                    ? 'text-primary' 
                    : 'text-foreground'
              }`}>
                {type.title}
              </h3>
              <p className={`text-sm ${
                isDisabled 
                  ? 'text-gray-400' 
                  : isSelected 
                    ? 'text-primary/80' 
                    : 'text-muted-foreground'
              }`}>
                {type.description}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}