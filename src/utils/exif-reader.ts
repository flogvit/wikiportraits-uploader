import { parse } from 'exifr';
import { ExifData } from '@/types/common';
import { logger } from '@/utils/logger';

export type { ExifData } from '@/types/common';

/**
 * Extract EXIF metadata from an image file
 * @param file - Image file to read EXIF data from
 * @returns Promise with EXIF data or null if no data found
 */
export async function extractExifData(file: File): Promise<ExifData | null> {
  try {
    const exifData = await parse(file, {
      // Specify which tags we want to extract
      pick: [
        'DateTimeOriginal',
        'DateTime', 
        'CreateDate',
        'Make',
        'Model',
        'Orientation',
        'ExifImageWidth',
        'ExifImageHeight',
        'ISO',
        'FNumber',
        'ExposureTime',
        'FocalLength',
        'Flash',
        'GPSLatitude',
        'GPSLongitude',
        'GPSLatitudeRef',
        'GPSLongitudeRef'
      ]
    });

    if (!exifData) {
      return null;
    }

    // Extract the best available date/time
    const dateTime = exifData.DateTimeOriginal || exifData.DateTime || exifData.CreateDate;

    // Convert GPS coordinates if available
    let gps: ExifData['gps'] | undefined;
    if (exifData.GPSLatitude && exifData.GPSLongitude) {
      gps = {
        latitude: convertGPSCoordinate(exifData.GPSLatitude, exifData.GPSLatitudeRef),
        longitude: convertGPSCoordinate(exifData.GPSLongitude, exifData.GPSLongitudeRef)
      };
    }

    return {
      dateTime: dateTime ? new Date(dateTime) : undefined,
      make: exifData.Make,
      model: exifData.Model,
      orientation: exifData.Orientation,
      width: exifData.ExifImageWidth,
      height: exifData.ExifImageHeight,
      iso: exifData.ISO,
      fNumber: exifData.FNumber,
      exposureTime: exifData.ExposureTime,
      focalLength: exifData.FocalLength,
      flash: exifData.Flash ? Boolean(exifData.Flash & 1) : undefined,
      gps
    };
  } catch (error) {
    logger.warn('exif-reader', 'Failed to extract EXIF data', error);
    return null;
  }
}

/**
 * Convert GPS coordinate from EXIF format to decimal degrees
 */
function convertGPSCoordinate(coordinate: number[] | number, ref?: string): number | undefined {
  if (typeof coordinate === 'number') {
    return ref === 'S' || ref === 'W' ? -coordinate : coordinate;
  }
  
  if (Array.isArray(coordinate) && coordinate.length >= 3) {
    const decimal = coordinate[0] + coordinate[1] / 60 + coordinate[2] / 3600;
    return ref === 'S' || ref === 'W' ? -decimal : decimal;
  }
  
  return undefined;
}

/**
 * Format date for Commons (YYYY-MM-DD format)
 */
export function formatDateForCommons(date: Date): string {
  return date.toISOString().split('T')[0];
}

/**
 * Format time for Commons (HH:MM:SS format)
 */
export function formatTimeForCommons(date: Date): string {
  return date.toTimeString().split(' ')[0]; // Gets HH:MM:SS portion
}

/**
 * Format date and time for display
 */
export function formatDateTimeForDisplay(date: Date): string {
  return date.toLocaleString();
}