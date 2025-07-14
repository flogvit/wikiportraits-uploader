'use client';

import { useState } from 'react';
import { Camera, Music, Users, FileImage } from 'lucide-react';

export type UploadType = 'general' | 'soccer' | 'music' | 'portraits';

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
    color: 'bg-muted hover:bg-muted/80 border-border'
  },
  {
    id: 'soccer' as UploadType,
    title: 'Soccer Match',
    description: 'Upload players from a soccer match with team tagging',
    icon: Users,
    color: 'bg-success/20 hover:bg-success/30 border-success/40'
  },
  {
    id: 'music' as UploadType,
    title: 'Music Event',
    description: 'Upload musicians and performers from an event',
    icon: Music,
    color: 'bg-accent hover:bg-accent/80 border-accent/40'
  },
  {
    id: 'portraits' as UploadType,
    title: 'Portrait Session',
    description: 'Upload portrait photos with enhanced metadata',
    icon: Camera,
    color: 'bg-primary/20 hover:bg-primary/30 border-primary/40'
  }
];

export default function UploadTypeSelector({ onTypeSelect, selectedType }: UploadTypeSelectorProps) {
  const [selected, setSelected] = useState<UploadType | undefined>(selectedType);

  const handleSelect = (type: UploadType) => {
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
          
          return (
            <button
              key={type.id}
              onClick={() => handleSelect(type.id)}
              className={`
                p-6 rounded-lg border-2 transition-all duration-200 text-left
                ${isSelected 
                  ? 'border-primary bg-primary/10 shadow-md' 
                  : `${type.color} shadow-sm`
                }
              `}
            >
              <div className="flex items-center mb-3">
                <Icon 
                  className={`w-8 h-8 ${
                    isSelected ? 'text-primary' : 'text-muted-foreground'
                  }`} 
                />
                {isSelected && (
                  <div className="ml-auto w-6 h-6 bg-primary rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${
                isSelected ? 'text-primary' : 'text-foreground'
              }`}>
                {type.title}
              </h3>
              <p className={`text-sm ${
                isSelected ? 'text-primary/80' : 'text-muted-foreground'
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