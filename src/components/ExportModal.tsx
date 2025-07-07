'use client';

import { useState } from 'react';
import { X, Download, FileText, Table, Code, Database } from 'lucide-react';
import { ImageFile } from '@/app/page';
import { 
  exportMetadataAsJSON, 
  exportMetadataAsCSV, 
  exportCommonsWikitext, 
  exportQuickStatements 
} from '@/utils/export';

interface ExportModalProps {
  images: ImageFile[];
  isOpen: boolean;
  onClose: () => void;
}

export default function ExportModal({ images, isOpen, onClose }: ExportModalProps) {
  const [selectedFormat, setSelectedFormat] = useState<string>('');

  if (!isOpen) return null;

  const exportOptions = [
    {
      id: 'json',
      name: 'JSON Metadata',
      description: 'Complete metadata in JSON format for backup or import',
      icon: <Database className="w-5 h-5" />,
      action: () => exportMetadataAsJSON(images)
    },
    {
      id: 'csv',
      name: 'CSV Spreadsheet',
      description: 'Tabular format for analysis in Excel or Google Sheets',
      icon: <Table className="w-5 h-5" />,
      action: () => exportMetadataAsCSV(images)
    },
    {
      id: 'wikitext',
      name: 'Commons Wikitext',
      description: 'Ready-to-use wikitext for Commons file pages',
      icon: <FileText className="w-5 h-5" />,
      action: () => exportCommonsWikitext(images)
    },
    {
      id: 'quickstatements',
      name: 'QuickStatements (Wikidata)',
      description: 'Commands for batch adding P18 image claims to Wikidata',
      icon: <Code className="w-5 h-5" />,
      action: () => exportQuickStatements(images)
    }
  ];

  const handleExport = (option: typeof exportOptions[0]) => {
    option.action();
    setSelectedFormat(option.id);
    setTimeout(() => {
      setSelectedFormat('');
      onClose();
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Export Metadata ({images.length} images)
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-600 mb-6">
            Choose a format to export your image metadata. This is useful for backup, 
            sharing with collaborators, or preparing data for upload.
          </p>

          <div className="space-y-4">
            {exportOptions.map(option => (
              <button
                key={option.id}
                onClick={() => handleExport(option)}
                disabled={selectedFormat === option.id}
                className="w-full p-4 border border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <div className="flex items-start space-x-3">
                  <div className="text-blue-500 mt-0.5">
                    {option.icon}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-medium text-gray-900">
                        {option.name}
                      </h3>
                      {selectedFormat === option.id ? (
                        <span className="text-sm text-green-600 font-medium">
                          Downloaded!
                        </span>
                      ) : (
                        <Download className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">
                      {option.description}
                    </p>
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="mt-6 p-4 bg-blue-50 rounded-lg">
            <h4 className="font-medium text-blue-900 mb-2">Export Tips:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• <strong>JSON:</strong> Best for importing back into this tool</li>
              <li>• <strong>CSV:</strong> Great for spreadsheet analysis and editing metadata in bulk</li>
              <li>• <strong>Wikitext:</strong> Copy-paste ready for Commons file pages</li>
              <li>• <strong>QuickStatements:</strong> Requires manual Q-ID addition for Wikidata uploads</li>
            </ul>
          </div>
        </div>

        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}