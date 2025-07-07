'use client';

import { useState } from 'react';
import { Eye, Code, Copy, Check } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { generateCommonsWikitext, generateFilename } from '@/utils/commons-template';

interface CommonsPreviewProps {
  image: ImageFile;
  index?: number;
}

export default function CommonsPreview({ image, index }: CommonsPreviewProps) {
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);

  const wikitext = generateCommonsWikitext(image);
  const suggestedFilename = generateFilename(image, index);

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(wikitext);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  if (!showPreview) {
    return (
      <button
        onClick={() => setShowPreview(true)}
        className="flex items-center space-x-2 text-sm text-blue-600 hover:text-blue-800"
      >
        <Eye className="w-4 h-4" />
        <span>Preview Commons Page</span>
      </button>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-medium text-gray-900">Commons File Page Preview</h4>
        <button
          onClick={() => setShowPreview(false)}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          Hide Preview
        </button>
      </div>

      <div className="bg-yellow-50 p-3 rounded-md border border-yellow-200">
        <p className="text-sm text-yellow-800">
          <strong>Suggested filename:</strong> {suggestedFilename}
        </p>
      </div>

      <div className="border border-gray-200 rounded-md">
        <div className="flex items-center justify-between bg-gray-50 px-3 py-2 border-b border-gray-200">
          <div className="flex items-center space-x-2">
            <Code className="w-4 h-4 text-gray-500" />
            <span className="text-sm font-medium text-gray-700">Wikitext</span>
          </div>
          <button
            onClick={copyToClipboard}
            className="flex items-center space-x-1 text-sm text-gray-600 hover:text-gray-800"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-green-500">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
        <div className="p-3">
          <pre className="text-xs text-gray-800 whitespace-pre-wrap font-mono">
            {wikitext}
          </pre>
        </div>
      </div>

      <div className="bg-blue-50 p-3 rounded-md border border-blue-200">
        <h5 className="font-medium text-blue-900 mb-2">How this will appear on Commons:</h5>
        <div className="text-sm text-blue-800 space-y-1">
          <p><strong>Description:</strong> {image.metadata.description}</p>
          <p><strong>Author:</strong> {image.metadata.author}</p>
          <p><strong>Date:</strong> {image.metadata.date}</p>
          <p><strong>Source:</strong> {image.metadata.source}</p>
          <p><strong>License:</strong> {image.metadata.license}</p>
          <p><strong>Categories:</strong></p>
          <ul className="list-disc list-inside ml-4">
            <li>WikiPortraits at {image.metadata.wikiPortraitsEvent}</li>
            {image.metadata.categories.map(cat => (
              <li key={cat}>{cat}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}