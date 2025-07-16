// Common interfaces used across the application

export interface Country {
  name: string;
  code: string;
  searchTerms: string[];
  language?: string;
  wikidataId?: string; // Q-code for Wikidata
}

export interface ExifData {
  dateTime?: Date;
  make?: string;
  model?: string;
  orientation?: number;
  width?: number;
  height?: number;
  iso?: number;
  fNumber?: number;
  exposureTime?: number;
  focalLength?: number;
  flash?: boolean;
  gps?: {
    latitude?: number;
    longitude?: number;
  };
}

export interface DuplicateInfo {
  file: File;
  duplicateOf: string; // ID of existing image
  reason: 'identical' | 'sameName' | 'similarSize';
}

export interface UploadStatus {
  id: string;
  status: 'pending' | 'uploading' | 'completed' | 'error';
  progress: number;
  error?: string;
}

export interface CSRFTokenResponse {
  query: {
    tokens: {
      csrftoken: string;
    };
  };
}

export interface UploadResponse {
  upload: {
    result: string;
    filename?: string;
    warnings?: Record<string, string>;
    error?: {
      code: string;
      info: string;
    };
  };
}

export interface CategoryStatus {
  name: string;
  status: 'pending' | 'creating' | 'success' | 'error';
  error?: string;
}