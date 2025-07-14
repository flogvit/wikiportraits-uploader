'use client';

import { ImageFile } from '@/app/page';
import { extractExifData, formatDateForCommons, formatTimeForCommons } from '@/utils/exif-reader';
import { generateCommonsWikitext } from '@/utils/commons-template';
import { generateTemplateName } from '@/utils/template-generator';
import { UploadType } from '../selectors/UploadTypeSelector';
import { SoccerMatchMetadata, SoccerPlayer } from '../forms/SoccerMatchForm';
import { generateSoccerCategories, generateMatchDescription } from '@/utils/soccer-categories';
import { MusicEventMetadata } from '@/types/music';
import { generateEventDescription } from '@/utils/music-categories';
import { getItem, KEYS } from '@/utils/localStorage';

interface FileProcessorProps {
  uploadType: UploadType;
  soccerMatchData?: SoccerMatchMetadata | null;
  selectedPlayers?: SoccerPlayer[];
  musicEventData?: MusicEventMetadata | null;
}

export class FileProcessor {
  constructor(
    private uploadType: UploadType,
    private soccerMatchData?: SoccerMatchMetadata | null,
    private selectedPlayers?: SoccerPlayer[],
    private musicEventData?: MusicEventMetadata | null
  ) {}

  async createImageFiles(files: File[]): Promise<ImageFile[]> {
    const imageFiles = await Promise.all(files.map(async file => {
      // Extract EXIF data to get actual capture date and time
      const exifData = await extractExifData(file);
      const hasExifDate = Boolean(exifData?.dateTime);
      const captureDate = hasExifDate ? formatDateForCommons(exifData!.dateTime!) : new Date().toISOString().split('T')[0];
      const captureTime = hasExifDate ? formatTimeForCommons(exifData!.dateTime!) : undefined;
      
      // Extract GPS coordinates from EXIF or use event location as fallback
      let gpsData = undefined;
      if (exifData?.gps?.latitude && exifData?.gps?.longitude) {
        gpsData = {
          latitude: exifData.gps.latitude,
          longitude: exifData.gps.longitude
        };
      }

      // Generate preview URL
      const preview = URL.createObjectURL(file);

      // Get author info from localStorage
      const authorUsername = getItem(KEYS.AUTHOR_USERNAME);
      const authorFullName = getItem(KEYS.AUTHOR_FULLNAME);
      
      // Format author field
      let formattedAuthor = '';
      if (authorUsername && authorFullName) {
        formattedAuthor = `[[User:${authorUsername}|${authorFullName}]]`;
      } else if (authorFullName) {
        formattedAuthor = authorFullName;
      } else if (authorUsername) {
        formattedAuthor = `[[User:${authorUsername}]]`;
      }

      // Initial metadata based on upload type
      let initialMetadata = {
        description: '',
        author: formattedAuthor,
        authorUsername: authorUsername,
        authorFullName: authorFullName,
        date: captureDate,
        time: captureTime,
        dateFromExif: hasExifDate,
        source: 'own work',
        license: 'CC-BY-SA-4.0',
        categories: [] as string[],
        wikiPortraitsEvent: this.uploadType === 'general' ? 'general' : (this.uploadType === 'soccer' ? 'soccer' : 'music'),
        wikitext: '',
        wikitextModified: false,
        template: '',
        templateModified: false,
        gps: gpsData,
      };

      // Add upload type specific metadata
      if (this.uploadType === 'soccer' && this.soccerMatchData) {
        const soccerCategories = generateSoccerCategories(this.soccerMatchData);
        const soccerDescription = generateMatchDescription(this.soccerMatchData);
        
        initialMetadata = {
          ...initialMetadata,
          description: soccerDescription,
          categories: soccerCategories,
          template: generateTemplateName(this.soccerMatchData),
        };
      } else if (this.uploadType === 'music' && this.musicEventData) {
        const musicDescription = generateEventDescription(this.musicEventData);
        initialMetadata = {
          ...initialMetadata,
          description: musicDescription,
          selectedBand: this.musicEventData.festivalData?.selectedBands?.[0]?.name || '',
        };
      }

      const imageFile: ImageFile = {
        id: `${file.name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        file,
        preview,
        metadata: initialMetadata,
      };

      // Generate initial wikitext
      const wikitextResult = generateCommonsWikitext(imageFile);
      imageFile.metadata.wikitext = wikitextResult.wikitext;

      return imageFile;
    }));

    return imageFiles;
  }

  static createProcessor(props: FileProcessorProps): FileProcessor {
    return new FileProcessor(
      props.uploadType,
      props.soccerMatchData,
      props.selectedPlayers,
      props.musicEventData
    );
  }
}