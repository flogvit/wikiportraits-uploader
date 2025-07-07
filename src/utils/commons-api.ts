/**
 * Commons API utilities for CSRF token management and file uploads
 */

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

/**
 * Fetches CSRF token from Commons API
 */
export async function fetchCSRFToken(accessToken?: string): Promise<string> {
  const url = new URL(process.env.COMMONS_API_URL || 'https://commons.wikimedia.org/w/api.php');
  url.searchParams.set('action', 'query');
  url.searchParams.set('meta', 'tokens');
  url.searchParams.set('format', 'json');
  url.searchParams.set('origin', '*');

  const headers: Record<string, string> = {
    'User-Agent': 'WikiPortraits Bulk Uploader/1.0 (https://github.com/flogvit/wikiportraits)',
  };

  if (accessToken) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers,
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch CSRF token: ${response.status} ${response.statusText}`);
  }

  const data: CSRFTokenResponse = await response.json();
  
  if (!data.query?.tokens?.csrftoken) {
    throw new Error('CSRF token not found in response');
  }

  return data.query.tokens.csrftoken;
}

/**
 * Uploads a file to Commons using the MediaWiki API
 */
export async function uploadToCommons(
  file: File,
  filename: string,
  text: string,
  accessToken: string,
  csrfToken: string,
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('action', 'upload');
  formData.append('format', 'json');
  formData.append('filename', filename);
  formData.append('file', file);
  formData.append('text', text);
  formData.append('token', csrfToken);
  formData.append('ignorewarnings', '0');

  const xhr = new XMLHttpRequest();
  
  return new Promise((resolve, reject) => {
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable && onProgress) {
        const progress = (e.loaded / e.total) * 100;
        onProgress(progress);
      }
    });

    xhr.addEventListener('load', () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const response: UploadResponse = JSON.parse(xhr.responseText);
          resolve(response);
        } catch {
          reject(new Error('Failed to parse upload response'));
        }
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.statusText}`));
      }
    });

    xhr.addEventListener('error', () => {
      reject(new Error('Upload request failed'));
    });

    xhr.open('POST', process.env.COMMONS_API_URL || 'https://commons.wikimedia.org/w/api.php');
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('User-Agent', 'WikiPortraits Bulk Uploader/1.0 (https://github.com/flogvit/wikiportraits)');
    
    xhr.send(formData);
  });
}

/**
 * Chunks a large file for chunked upload
 */
export async function uploadFileInChunks(
  file: File,
  filename: string,
  text: string,
  accessToken: string,
  csrfToken: string,
  chunkSize: number = 10 * 1024 * 1024, // 10MB chunks
  onProgress?: (progress: number) => void
): Promise<UploadResponse> {
  if (file.size <= chunkSize) {
    return uploadToCommons(file, filename, text, accessToken, csrfToken, onProgress);
  }

  const totalChunks = Math.ceil(file.size / chunkSize);
  let uploadKey: string | undefined;

  for (let i = 0; i < totalChunks; i++) {
    const start = i * chunkSize;
    const end = Math.min(start + chunkSize, file.size);
    const chunk = file.slice(start, end);

    const formData = new FormData();
    formData.append('action', 'upload');
    formData.append('format', 'json');
    formData.append('filename', filename);
    formData.append('filesize', file.size.toString());
    formData.append('offset', start.toString());
    formData.append('chunk', chunk);
    formData.append('token', csrfToken);

    if (i === 0) {
      formData.append('stash', '1');
    } else if (uploadKey) {
      formData.append('filekey', uploadKey);
    }

    if (i === totalChunks - 1) {
      formData.append('text', text);
      formData.append('ignorewarnings', '0');
    }

    const response = await fetch(process.env.COMMONS_API_URL || 'https://commons.wikimedia.org/w/api.php', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'User-Agent': 'WikiPortraits Bulk Uploader/1.0 (https://github.com/flogvit/wikiportraits)',
      },
      body: formData,
    });

    if (!response.ok) {
      throw new Error(`Chunk upload failed: ${response.status} ${response.statusText}`);
    }

    const data: UploadResponse = await response.json();

    if (data.upload.error) {
      throw new Error(`Upload error: ${data.upload.error.code} - ${data.upload.error.info}`);
    }

    if (i === 0 && data.upload.result === 'Continue') {
      // Get the file key for subsequent chunks
      uploadKey = (data.upload as unknown as { filekey: string }).filekey;
    }

    if (onProgress) {
      const progress = ((i + 1) / totalChunks) * 100;
      onProgress(progress);
    }

    if (i === totalChunks - 1) {
      return data;
    }
  }

  throw new Error('Chunked upload completed but no final response received');
}