import { ImageFile } from '@/app/page';

interface MetadataTemplate {
  description: string;
  author: string;
  date: string;
  source: string;
  license: string;
  categories?: string[];
  event?: string;
  location?: string;
}

export function generateCommonsTemplate(metadata: MetadataTemplate): string {
  // Generate WikiPortraits category based on event
  const wikiPortraitsCategory = metadata.event 
    ? `WikiPortraits at ${metadata.event}`
    : 'WikiPortraits';

  // Format license template
  const licenseTemplate = metadata.license.startsWith('CC-') 
    ? `{{${metadata.license}}}`
    : `{{${metadata.license}}}`;

  // Build categories string
  const allCategories = [
    wikiPortraitsCategory,
    ...(metadata.categories || [])
  ].filter(Boolean);

  const categoriesWikitext = allCategories
    .map(cat => `[[Category:${cat}]]`)
    .join('\n');

  const wikitext = `=={{int:filedesc}}==
{{Information
|description={{en|${metadata.description}}}
|author=${metadata.author}
|date=${metadata.date}
|source=${metadata.source}
|permission=
|other_versions=
}}

=={{int:license-header}}==
${licenseTemplate}

${categoriesWikitext}`;

  return wikitext;
}

export function generateCommonsWikitext(image: ImageFile): string {
  const { metadata } = image;
  
  // Generate WikiPortraits category based on event
  const wikiPortraitsCategory = metadata.wikiPortraitsEvent 
    ? `WikiPortraits at ${metadata.wikiPortraitsEvent}`
    : 'WikiPortraits';

  // Format license template
  const licenseTemplate = metadata.license.startsWith('CC-') 
    ? `{{${metadata.license}}}`
    : `{{${metadata.license}}}`;

  // Build categories string
  const allCategories = [
    wikiPortraitsCategory,
    ...metadata.categories
  ].filter(Boolean);

  const categoriesWikitext = allCategories
    .map(cat => `[[Category:${cat}]]`)
    .join('\n');

  const wikitext = `=={{int:filedesc}}==
{{Information
|description={{en|${metadata.description}}}
|author=${metadata.author}
|date=${metadata.date}
|source=${metadata.source}
|permission=
|other_versions=
}}

=={{int:license-header}}==
${licenseTemplate}

${categoriesWikitext}`;

  return wikitext;
}

export function generateFilename(image: ImageFile): string {
  const { metadata } = image;
  const originalName = image.file.name;
  const extension = originalName.split('.').pop();
  
  // Create a descriptive filename based on description
  if (metadata.description) {
    // Clean the description for filename use
    const cleanDescription = metadata.description
      .replace(/[^a-zA-Z0-9\s-]/g, '') // Remove special chars
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .substring(0, 100); // Limit length
    
    return `${cleanDescription}.${extension}`;
  }
  
  return originalName;
}