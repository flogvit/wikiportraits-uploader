'use client';

import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, Image as ImageIcon } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { extractExifData, formatDateForCommons, formatTimeForCommons } from '@/utils/exif-reader';
import { detectDuplicates, DuplicateInfo } from '@/utils/duplicate-detection';
import DuplicateWarningModal from './DuplicateWarningModal';
import { UploadType } from './UploadTypeSelector';
import SoccerMatchWorkflow, { SoccerMatchMetadata, SoccerPlayer } from './SoccerMatchWorkflow';
import { generateSoccerCategories, generateMatchDescription } from '@/utils/soccer-categories';
import MusicEventWorkflow from './MusicEventWorkflow';
import { MusicEventMetadata } from '@/types/music';
import { generateEventDescription } from '@/utils/music-categories';

interface ImageUploaderProps {
  onImagesAdded: (images: ImageFile[]) => void;
  existingImages: ImageFile[];
  uploadType: UploadType;
  onSoccerDataUpdate?: (matchData: SoccerMatchMetadata, players: SoccerPlayer[]) => void;
  onMusicEventUpdate?: (eventData: MusicEventMetadata) => void;
}

// Validation functions to check if event setup is complete
function isSoccerSetupComplete(matchData: SoccerMatchMetadata | null): boolean {
  if (!matchData) return false;
  return !!(matchData.homeTeam?.name && matchData.awayTeam?.name && matchData.date && matchData.venue);
}

function isMusicSetupComplete(eventData: MusicEventMetadata | null): boolean {
  if (!eventData) return false;
  
  if (eventData.eventType === 'festival' && eventData.festivalData) {
    const festival = eventData.festivalData.festival;
    const hasBasicInfo = !!(festival.name && festival.year && festival.location);
    const hasBands = eventData.festivalData.selectedBands && eventData.festivalData.selectedBands.length > 0;
    return hasBasicInfo && hasBands;
  } else if (eventData.eventType === 'concert' && eventData.concertData) {
    const concert = eventData.concertData.concert;
    return !!(concert.artist.name && concert.venue && concert.date);
  }
  
  return false;
}

export default function ImageUploader({ onImagesAdded, existingImages, uploadType, onSoccerDataUpdate, onMusicEventUpdate }: ImageUploaderProps) {
  const [duplicates, setDuplicates] = useState<DuplicateInfo[]>([]);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [soccerMatchData, setSoccerMatchData] = useState<SoccerMatchMetadata | null>(null);
  const [selectedPlayers, setSelectedPlayers] = useState<SoccerPlayer[]>([]);
  const [musicEventData, setMusicEventData] = useState<MusicEventMetadata | null>(null);

  // Check if uploads should be allowed based on event setup completion
  const isUploadAllowed = () => {
    switch (uploadType) {
      case 'soccer':
        return isSoccerSetupComplete(soccerMatchData);
      case 'music':
        return isMusicSetupComplete(musicEventData);
      case 'general':
      case 'portraits':
      default:
        return true; // No setup required for general uploads
    }
  };

  const createImageFiles = async (files: File[]): Promise<ImageFile[]> => {
    const imageFiles = await Promise.all(files.map(async file => {
      // Extract EXIF data to get actual capture date and time
      const exifData = await extractExifData(file);
      const hasExifDate = Boolean(exifData?.dateTime);
      const captureDate = hasExifDate ? formatDateForCommons(exifData!.dateTime!) : new Date().toISOString().split('T')[0];
      const captureTime = hasExifDate ? formatTimeForCommons(exifData!.dateTime!) : undefined;
      
      const baseMetadata = {
        description: '',
        author: '',
        date: captureDate,
        time: captureTime,
        dateFromExif: hasExifDate,
        source: 'own work',
        license: 'CC-BY-SA-4.0',
        categories: [] as string[],
        wikiPortraitsEvent: ''
      };

      // Add soccer-specific metadata and categories if in soccer mode
      if (uploadType === 'soccer' && soccerMatchData) {
        const soccerCategories = generateSoccerCategories({
          matchData: soccerMatchData,
          selectedPlayers: selectedPlayers
        });
        
        const matchDescription = generateMatchDescription(soccerMatchData);
        
        return {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          metadata: {
            ...baseMetadata,
            description: matchDescription,
            categories: soccerCategories,
            wikiPortraitsEvent: `Soccer Match: ${soccerMatchData.homeTeam?.name || 'Unknown'} vs ${soccerMatchData.awayTeam?.name || 'Unknown'}`,
            soccerMatch: soccerMatchData.homeTeam && soccerMatchData.awayTeam ? {
              homeTeam: soccerMatchData.homeTeam.name,
              awayTeam: soccerMatchData.awayTeam.name,
              date: soccerMatchData.date,
              venue: soccerMatchData.venue,
              competition: soccerMatchData.competition,
              result: soccerMatchData.result
            } : undefined
          }
        };
      }

      // Add music-specific metadata and categories if in music mode
      if (uploadType === 'music' && musicEventData) {
        let selectedBand = '';
        let musicCategories: string[] = [];
        let eventAuthor = '';
        
        // For festivals, use the selected band
        if (musicEventData.eventType === 'festival' && musicEventData.festivalData) {
          const festival = musicEventData.festivalData.festival;
          selectedBand = musicEventData.festivalData.selectedBands[0]?.name || '';
          
          // Extract username and full name separately
          const username = musicEventData.festivalData.authorUsername || '';
          const fullName = musicEventData.festivalData.authorFullName || '';
          
          // Generate formatted author for Commons template
          if (username && fullName) {
            eventAuthor = `[[User:${username}|${fullName}]]`;
          } else if (fullName) {
            eventAuthor = fullName;
          } else if (username) {
            eventAuthor = `[[User:${username}]]`;
          }
          
          if (selectedBand) {
            // Generate categories for this specific band
            musicCategories = [`WikiPortraits at ${festival.name} ${festival.year}`, `${selectedBand} at ${festival.name} ${festival.year}`];
            if (musicEventData.festivalData.addToWikiPortraitsConcerts) {
              musicCategories.unshift('WikiPortraits at Concerts');
            }
          }
        } else if (musicEventData.eventType === 'concert' && musicEventData.concertData) {
          // For concerts, use the artist name
          selectedBand = musicEventData.concertData.concert.artist.name;
          
          // Extract username and full name separately
          const username = musicEventData.concertData.authorUsername || '';
          const fullName = musicEventData.concertData.authorFullName || '';
          
          // Generate formatted author for Commons template
          if (username && fullName) {
            eventAuthor = `[[User:${username}|${fullName}]]`;
          } else if (fullName) {
            eventAuthor = fullName;
          } else if (username) {
            eventAuthor = `[[User:${username}]]`;
          }
          musicCategories = [selectedBand];
          if (musicEventData.concertData.addToWikiPortraitsConcerts) {
            musicCategories.unshift('WikiPortraits at Concerts');
          }
        }
        
        const eventDescription = generateEventDescription(musicEventData);
        
        let eventName = '';
        if (musicEventData.eventType === 'festival' && musicEventData.festivalData) {
          const festival = musicEventData.festivalData.festival;
          eventName = `${festival.name} ${festival.year}`;
        } else if (musicEventData.eventType === 'concert' && musicEventData.concertData) {
          const concert = musicEventData.concertData.concert;
          eventName = `${concert.artist.name}`;
        }
        
        return {
          id: crypto.randomUUID(),
          file,
          preview: URL.createObjectURL(file),
          metadata: {
            ...baseMetadata,
            author: eventAuthor || baseMetadata.author, // Use event author if available
            authorUsername: musicEventData.eventType === 'festival' 
              ? musicEventData.festivalData?.authorUsername || ''
              : musicEventData.concertData?.authorUsername || '',
            authorFullName: musicEventData.eventType === 'festival'
              ? musicEventData.festivalData?.authorFullName || ''
              : musicEventData.concertData?.authorFullName || '',
            description: eventDescription,
            categories: musicCategories,
            wikiPortraitsEvent: eventName,
            musicEvent: musicEventData,
            selectedBand: selectedBand // Automatically assign the band
          }
        };
      }

      // Default metadata for other upload types
      return {
        id: crypto.randomUUID(),
        file,
        preview: URL.createObjectURL(file),
        metadata: baseMetadata
      };
    }));
    
    return imageFiles;
  };

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    // Only allow uploads if event setup is complete
    if (!isUploadAllowed()) {
      return;
    }

    const imageFiles = acceptedFiles.filter(file => 
      file.type.startsWith('image/')
    );

    // Check for duplicates
    const { validFiles, duplicates: foundDuplicates } = detectDuplicates(imageFiles, existingImages);

    if (foundDuplicates.length > 0) {
      setDuplicates(foundDuplicates);
      setPendingFiles(imageFiles); // Store all files (including duplicates) for potential override
      setShowDuplicateModal(true);
    }

    // Add valid files immediately
    if (validFiles.length > 0) {
      const newImages = await createImageFiles(validFiles);
      onImagesAdded(newImages);
    }
  }, [onImagesAdded, existingImages, uploadType, soccerMatchData, selectedPlayers, musicEventData]);

  const handleAddAnyway = async () => {
    // Add all pending files, including duplicates
    const newImages = await createImageFiles(pendingFiles);
    onImagesAdded(newImages);
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingFiles([]);
  };

  const handleCloseDuplicateModal = () => {
    setShowDuplicateModal(false);
    setDuplicates([]);
    setPendingFiles([]);
  };

  const uploadAllowed = isUploadAllowed();
  
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.gif', '.webp']
    },
    multiple: true,
    disabled: !uploadAllowed
  });

  return (
    <>
      {uploadType === 'soccer' && (
        <SoccerMatchWorkflow
          onMatchDataUpdate={(matchData) => {
            setSoccerMatchData(matchData);
            if (onSoccerDataUpdate) {
              onSoccerDataUpdate(matchData, selectedPlayers);
            }
          }}
          onPlayersUpdate={(players) => {
            setSelectedPlayers(players);
            if (onSoccerDataUpdate && soccerMatchData) {
              onSoccerDataUpdate(soccerMatchData, players);
            }
          }}
        />
      )}

      {uploadType === 'music' && (
        <MusicEventWorkflow
          onMusicEventUpdate={(eventData) => {
            setMusicEventData(eventData);
            if (onMusicEventUpdate) {
              onMusicEventUpdate(eventData);
            }
          }}
        />
      )}
      
      <div
        {...getRootProps()}
        className={`
          border-2 border-dashed rounded-lg p-12 text-center transition-all
          ${!uploadAllowed 
            ? 'border-gray-200 bg-gray-50 cursor-not-allowed'
            : isDragActive 
              ? 'border-blue-500 bg-blue-50 cursor-pointer' 
              : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50 cursor-pointer'
          }
        `}
      >
        <input {...getInputProps()} />
        
        <div className="flex flex-col items-center space-y-4">
          {!uploadAllowed ? (
            <ImageIcon className="w-16 h-16 text-gray-300" />
          ) : isDragActive ? (
            <Upload className="w-16 h-16 text-blue-500" />
          ) : (
            <ImageIcon className="w-16 h-16 text-gray-400" />
          )}
          
          <div>
            {!uploadAllowed ? (
              <>
                <p className="text-xl font-semibold text-gray-400 mb-2">
                  Complete event setup first
                </p>
                <p className="text-gray-400">
                  {uploadType === 'soccer' && 'Please fill in match details, teams, and venue'}
                  {uploadType === 'music' && 'Please complete festival/concert information and add bands/artists'}
                </p>
                <p className="text-sm text-gray-300 mt-2">
                  Images will be available once setup is complete
                </p>
              </>
            ) : (
              <>
                <p className="text-xl font-semibold text-gray-700 mb-2">
                  {isDragActive 
                    ? 'Drop the images here...' 
                    : 'Drag & drop portrait images here'
                  }
                </p>
                <p className="text-gray-500">
                  or click to select files
                </p>
                <p className="text-sm text-gray-400 mt-2">
                  Supports JPEG, PNG, GIF, WebP formats
                </p>
              </>
            )}
          </div>
        </div>
      </div>

      <DuplicateWarningModal
        duplicates={duplicates}
        isOpen={showDuplicateModal}
        onClose={handleCloseDuplicateModal}
        onAddAnyway={handleAddAnyway}
      />
    </>
  );
}