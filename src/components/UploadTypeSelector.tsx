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
    color: 'bg-gray-100 hover:bg-gray-200 border-gray-300'
  },
  {
    id: 'soccer' as UploadType,
    title: 'Soccer Match',
    description: 'Upload players from a soccer match with team tagging',
    icon: Users,
    color: 'bg-green-100 hover:bg-green-200 border-green-300'
  },
  {
    id: 'music' as UploadType,
    title: 'Music Event',
    description: 'Upload musicians and performers from an event',
    icon: Music,
    color: 'bg-purple-100 hover:bg-purple-200 border-purple-300'
  },
  {
    id: 'portraits' as UploadType,
    title: 'Portrait Session',
    description: 'Upload portrait photos with enhanced metadata',
    icon: Camera,
    color: 'bg-blue-100 hover:bg-blue-200 border-blue-300'
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
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">Choose Upload Type</h2>
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
                  ? 'border-blue-500 bg-blue-50 shadow-md' 
                  : `${type.color} shadow-sm`
                }
              `}
            >
              <div className="flex items-center mb-3">
                <Icon 
                  className={`w-8 h-8 ${
                    isSelected ? 'text-blue-600' : 'text-gray-600'
                  }`} 
                />
                {isSelected && (
                  <div className="ml-auto w-6 h-6 bg-blue-600 rounded-full flex items-center justify-center">
                    <div className="w-2 h-2 bg-white rounded-full"></div>
                  </div>
                )}
              </div>
              <h3 className={`font-semibold text-lg mb-2 ${
                isSelected ? 'text-blue-900' : 'text-gray-900'
              }`}>
                {type.title}
              </h3>
              <p className={`text-sm ${
                isSelected ? 'text-blue-700' : 'text-gray-600'
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