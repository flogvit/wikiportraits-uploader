import { ImageFile } from '@/app/page';
import { generateCommonsWikitext, generateFilename } from './commons-template';

export function exportMetadataAsJSON(images: ImageFile[]): void {
  const exportData = images.map(image => ({
    filename: image.file.name,
    suggestedCommonsName: generateFilename(image),
    metadata: image.metadata,
    size: image.file.size,
    type: image.file.type,
    lastModified: image.file.lastModified
  }));

  const blob = new Blob([JSON.stringify(exportData, null, 2)], {
    type: 'application/json'
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wikiportraits-metadata-${Date.now()}.json`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportMetadataAsCSV(images: ImageFile[]): void {
  const headers = [
    'Original Filename',
    'Suggested Commons Name',
    'Description',
    'Author',
    'Date',
    'Source',
    'License',
    'WikiPortraits Event',
    'Additional Categories',
    'File Size',
    'File Type'
  ];

  const rows = images.map(image => [
    image.file.name,
    generateFilename(image),
    image.metadata.description,
    image.metadata.author,
    image.metadata.date,
    image.metadata.source,
    image.metadata.license,
    image.metadata.wikiPortraitsEvent,
    image.metadata.categories.join('; '),
    image.file.size.toString(),
    image.file.type
  ]);

  const csvContent = [headers, ...rows]
    .map(row => row.map(field => `"${field.replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wikiportraits-metadata-${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportCommonsWikitext(images: ImageFile[]): void {
  const wikitextContent = images
    .map(image => {
      const filename = generateFilename(image);
      const wikitext = generateCommonsWikitext(image);
      return `=== ${filename} ===\n\n${wikitext}\n\n${'='.repeat(50)}\n`;
    })
    .join('\n');

  const header = `# WikiPortraits Bulk Upload - Commons Wikitext
# Generated on ${new Date().toISOString()}
# Total images: ${images.length}

${'='.repeat(50)}

`;

  const fullContent = header + wikitextContent;

  const blob = new Blob([fullContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wikiportraits-wikitext-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function generateQuickStatementsCommands(images: ImageFile[]): string {
  // This would generate QuickStatements commands for Wikidata
  // Format: Q-ID|P18|filename
  // For now, return template that users can fill in with Q-IDs
  
  return images
    .map(image => {
      const filename = generateFilename(image);
      return `QXXXXX|P18|${filename}`;
    })
    .join('\n');
}

export function exportQuickStatements(images: ImageFile[]): void {
  const commands = generateQuickStatementsCommands(images);
  const header = `# WikiPortraits - QuickStatements Commands for Wikidata
# Generated on ${new Date().toISOString()}
# Instructions:
# 1. Replace QXXXXX with actual Wikidata Q-IDs for each person
# 2. Paste into QuickStatements (https://quickstatements.toolforge.org/)
# 3. Review and run the batch

`;

  const fullContent = header + commands;

  const blob = new Blob([fullContent], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `wikiportraits-quickstatements-${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}