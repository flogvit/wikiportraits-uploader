'use client';

import { useState } from 'react';
import {
  Camera,
  Music,
  Users,
  FileImage,
  Award,
  Film,
  Mic2,
  Briefcase,
  Trophy,
  Palette,
  Building2,
  Megaphone
} from 'lucide-react';
import { UploadType } from '@/types/upload';

interface UploadTypeSelectorProps {
  onTypeSelect: (type: UploadType) => void;
  selectedType?: UploadType;
}

const uploadTypes = [
  {
    id: 'general' as const,
    title: 'General Upload',
    description: 'Standard WikiPortraits upload with basic metadata',
    icon: FileImage,
    color: 'bg-muted hover:bg-muted/80 border-border',
    disabled: true
  },
  {
    id: 'music' as UploadType,
    title: 'Music Event',
    description: 'Festivals, concerts, and music performances',
    icon: Music,
    color: 'bg-accent hover:bg-accent/80 border-accent/40',
    disabled: false
  },
  {
    id: 'awards' as const,
    title: 'Awards & Ceremonies',
    description: 'Nobel Prize, Oscars, Grammys, and other award events',
    icon: Award,
    color: 'bg-yellow-100 hover:bg-yellow-200 border-yellow-300',
    disabled: true
  },
  {
    id: 'red-carpet' as const,
    title: 'Red Carpet Events',
    description: 'Movie premieres, fashion shows, and galas',
    icon: Film,
    color: 'bg-red-100 hover:bg-red-200 border-red-300',
    disabled: true
  },
  {
    id: 'press' as const,
    title: 'Press Conferences',
    description: 'Political, movie, and product press conferences',
    icon: Mic2,
    color: 'bg-blue-100 hover:bg-blue-200 border-blue-300',
    disabled: true
  },
  {
    id: 'sports' as const,
    title: 'Sports Events',
    description: 'Soccer, Olympics, tennis, and other sporting events',
    icon: Trophy,
    color: 'bg-green-100 hover:bg-green-200 border-green-300',
    disabled: true
  },
  {
    id: 'production' as const,
    title: 'Film & TV Production',
    description: 'Movie shoots, TV filming, and behind-the-scenes',
    icon: Film,
    color: 'bg-purple-100 hover:bg-purple-200 border-purple-300',
    disabled: true
  },
  {
    id: 'political' as const,
    title: 'Political Events',
    description: 'Rallies, debates, summits, and campaigns',
    icon: Megaphone,
    color: 'bg-indigo-100 hover:bg-indigo-200 border-indigo-300',
    disabled: true
  },
  {
    id: 'cultural' as const,
    title: 'Cultural Events',
    description: 'Theatre, opera, art exhibitions, and performances',
    icon: Palette,
    color: 'bg-pink-100 hover:bg-pink-200 border-pink-300',
    disabled: true
  },
  {
    id: 'corporate' as const,
    title: 'Corporate Events',
    description: 'Tech conferences, product launches, business meetings',
    icon: Briefcase,
    color: 'bg-slate-100 hover:bg-slate-200 border-slate-300',
    disabled: true
  },
  {
    id: 'portraits' as const,
    title: 'Portrait Session',
    description: 'Professional portrait photography sessions',
    icon: Camera,
    color: 'bg-orange-100 hover:bg-orange-200 border-orange-300',
    disabled: true
  }
];

export default function UploadTypeSelector({ onTypeSelect, selectedType }: UploadTypeSelectorProps) {
  const [selected, setSelected] = useState<UploadType | undefined>(selectedType);

  const handleSelect = (type: any, disabled: boolean) => {
    if (disabled) return;
    if (type === 'music') {
      setSelected(type);
      onTypeSelect(type);
    }
  };

  return (
    <div className="mb-8">
      <h2 className="text-2xl font-semibold text-foreground mb-4">Choose Upload Type</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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