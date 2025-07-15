'use client';

import { useState, useEffect } from 'react';
import { User, X } from 'lucide-react';
import { BandMember } from '@/types/music';
import { ImageFile } from '@/app/page';

interface ImageBandMemberTaggerProps {
  image: ImageFile;
  availableMembers: BandMember[];
  onMembersChange: (imageId: string, memberIds: string[]) => void;
}

export default function ImageBandMemberTagger({
  image,
  availableMembers,
  onMembersChange,
}: ImageBandMemberTaggerProps) {
  const [selectedMembers, setSelectedMembers] = useState<string[]>(
    image.metadata.selectedBandMembers || []
  );
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    setSelectedMembers(image.metadata.selectedBandMembers || []);
  }, [image.metadata.selectedBandMembers]);

  const toggleMember = (memberId: string) => {
    const newSelected = selectedMembers.includes(memberId)
      ? selectedMembers.filter(id => id !== memberId)
      : [...selectedMembers, memberId];
    
    setSelectedMembers(newSelected);
    onMembersChange(image.id, newSelected);
  };

  const removeMember = (memberId: string) => {
    const newSelected = selectedMembers.filter(id => id !== memberId);
    setSelectedMembers(newSelected);
    onMembersChange(image.id, newSelected);
  };

  const selectedMemberObjects = availableMembers.filter(member => 
    selectedMembers.includes(member.id)
  );

  const unselectedMembers = availableMembers.filter(member => 
    !selectedMembers.includes(member.id)
  );

  if (availableMembers.length === 0) {
    return (
      <div className="text-sm text-muted-foreground">
        No band members available. Select a band first.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-card-foreground">
        Band Members in This Image
      </div>
      
      {/* Selected Members Display */}
      {selectedMemberObjects.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {selectedMemberObjects.map(member => (
            <div
              key={member.id}
              className="flex items-center gap-1 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-xs"
            >
              <User className="w-3 h-3" />
              <span>{member.name}</span>
              <button
                onClick={() => removeMember(member.id)}
                className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add Members Button */}
      {unselectedMembers.length > 0 && (
        <div className="relative">
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="text-sm text-primary hover:text-primary/80 underline"
          >
            + Add member{unselectedMembers.length > 1 ? 's' : ''}
          </button>

          {/* Dropdown */}
          {isOpen && (
            <div className="absolute z-10 mt-1 w-64 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-40 overflow-y-auto">
              {unselectedMembers.map(member => (
                <div
                  key={member.id}
                  className="p-2 hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                  onClick={() => {
                    toggleMember(member.id);
                    setIsOpen(false);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <div>
                      <div className="font-medium text-sm">{member.name}</div>
                      {member.instruments && member.instruments.length > 0 && (
                        <div className="text-xs text-gray-500">
                          {member.instruments.join(', ')}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Click outside to close */}
      {isOpen && (
        <div
          className="fixed inset-0 z-0"
          onClick={() => setIsOpen(false)}
        />
      )}
    </div>
  );
}