'use client';

import { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Download, Upload, ChevronDown, ChevronUp } from 'lucide-react';
import { UserConfiguration } from '@/types/configuration';
import {
  loadConfiguration,
  saveConfiguration,
  resetConfiguration,
  exportConfiguration,
  importConfiguration
} from '@/utils/configuration-storage';
import { logger } from '@/utils/logger';

interface ConfigurationPanelProps {
  onClose?: () => void;
}

export default function ConfigurationPanel({ onClose }: ConfigurationPanelProps) {
  const [config, setConfig] = useState<UserConfiguration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['categories']));

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    setIsLoading(true);
    try {
      const loaded = await loadConfiguration();
      setConfig(loaded);
    } catch (error) {
      logger.error('ConfigurationPanel', 'Failed to load configuration', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!config) return;

    setIsSaving(true);
    try {
      await saveConfiguration(config);
      alert('Configuration saved successfully!');
    } catch (error) {
      logger.error('ConfigurationPanel', 'Failed to save configuration', error);
      alert('Failed to save configuration');
    } finally {
      setIsSaving(false);
    }
  };

  const handleReset = async () => {
    if (!confirm('Reset all settings to defaults? This cannot be undone.')) {
      return;
    }

    try {
      await resetConfiguration();
      await loadConfig();
      alert('Configuration reset to defaults');
    } catch (error) {
      logger.error('ConfigurationPanel', 'Failed to reset configuration', error);
      alert('Failed to reset configuration');
    }
  };

  const handleExport = async () => {
    try {
      const json = await exportConfiguration();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `wikiportraits-config-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      logger.error('ConfigurationPanel', 'Failed to export configuration', error);
      alert('Failed to export configuration');
    }
  };

  const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      const json = await file.text();
      await importConfiguration(json);
      await loadConfig();
      alert('Configuration imported successfully!');
    } catch (error) {
      logger.error('ConfigurationPanel', 'Failed to import configuration', error);
      alert('Failed to import configuration: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };

  const updateConfig = (path: string, value: any) => {
    if (!config) return;

    const pathParts = path.split('.');
    const newConfig = JSON.parse(JSON.stringify(config)); // Deep clone
    let current: any = newConfig;

    // Navigate to the parent of the target
    for (let i = 0; i < pathParts.length - 1; i++) {
      current = current[pathParts[i]];
    }

    // Set the value
    current[pathParts[pathParts.length - 1]] = value;

    setConfig(newConfig);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!config) {
    return <div className="p-8 text-center text-muted-foreground">Failed to load configuration</div>;
  }

  const Section = ({ title, id, children }: { title: string; id: string; children: React.ReactNode }) => {
    const isExpanded = expandedSections.has(id);

    return (
      <div className="border border-border rounded-lg overflow-hidden">
        <button
          onClick={() => toggleSection(id)}
          className="w-full flex items-center justify-between p-4 bg-muted/50 hover:bg-muted transition-colors"
        >
          <h3 className="font-semibold text-card-foreground">{title}</h3>
          {isExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
        </button>
        {isExpanded && (
          <div className="p-4 space-y-4 bg-card">
            {children}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-primary" />
          <h2 className="text-2xl font-bold text-card-foreground">WikiPortraits Configuration</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleExport}
            className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export
          </button>
          <label className="px-3 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg flex items-center gap-2 cursor-pointer">
            <Upload className="w-4 h-4" />
            Import
            <input type="file" accept=".json" onChange={handleImport} className="hidden" />
          </label>
        </div>
      </div>

      <div className="space-y-4">
        {/* Categories Configuration */}
        <Section title="Categories" id="categories">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.categories.autoAddPerformerCategories}
                  onChange={(e) => updateConfig('global.categories.autoAddPerformerCategories', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Auto-add performer categories when tagging</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.categories.autoAddBandAtEventCategory}
                  onChange={(e) => updateConfig('global.categories.autoAddBandAtEventCategory', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Auto-add "Band at Event" category</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Exclude from images (parent categories):
              </label>
              <textarea
                value={config.global.categories.excludeFromImages.join('\n')}
                onChange={(e) => updateConfig('global.categories.excludeFromImages', e.target.value.split('\n').filter(Boolean))}
                rows={4}
                placeholder="One category per line..."
                className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                These categories will be created but not added to individual images
              </p>
            </div>
          </div>
        </Section>

        {/* Permissions Configuration */}
        <Section title="Permissions" id="permissions">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.permissions.autoEnablePersonalityRights}
                  onChange={(e) => updateConfig('global.permissions.autoEnablePersonalityRights', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Auto-enable personality rights permission for events with people</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Default permission text:
              </label>
              <textarea
                value={config.global.permissions.defaultPermissionText}
                onChange={(e) => updateConfig('global.permissions.defaultPermissionText', e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-border rounded-md text-sm"
              />
            </div>
          </div>
        </Section>

        {/* Workflow Configuration */}
        <Section title="Workflow" id="workflow">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.workflow.autoFetchBandMembers}
                  onChange={(e) => updateConfig('global.workflow.autoFetchBandMembers', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Auto-fetch band members when selecting a band</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.workflow.autoGenerateFilenames}
                  onChange={(e) => updateConfig('global.workflow.autoGenerateFilenames', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Auto-generate filenames</span>
              </label>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.workflow.autoGenerateDescriptions}
                  onChange={(e) => updateConfig('global.workflow.autoGenerateDescriptions', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Auto-generate descriptions</span>
              </label>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Default license:
              </label>
              <select
                value={config.global.workflow.defaultLicense}
                onChange={(e) => updateConfig('global.workflow.defaultLicense', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="CC-BY-SA-4.0">CC BY-SA 4.0</option>
                <option value="CC-BY-4.0">CC BY 4.0</option>
                <option value="CC-BY-SA-3.0">CC BY-SA 3.0</option>
                <option value="CC-BY-3.0">CC BY 3.0</option>
                <option value="CC0">CC0 (Public Domain)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Default author:
              </label>
              <input
                type="text"
                value={config.global.workflow.defaultAuthor}
                onChange={(e) => updateConfig('global.workflow.defaultAuthor', e.target.value)}
                placeholder="e.g., [[d:Q135337664|Your Name]]"
                className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Use Wikidata link format: [[d:QXXXXXX|Your Name]]
              </p>
            </div>
          </div>
        </Section>

        {/* WikiPortraits Configuration */}
        <Section title="WikiPortraits Settings" id="wikiportraits">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">
                Default event type:
              </label>
              <select
                value={config.global.wikiportraits.eventType}
                onChange={(e) => updateConfig('global.wikiportraits.eventType', e.target.value)}
                className="w-full px-3 py-2 border border-border rounded-md"
              >
                <option value="music events">Music Events</option>
                <option value="festivals">Festivals</option>
                <option value="concerts">Concerts</option>
                <option value="sports events">Sports Events</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">
                Accent color:
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={config.global.wikiportraits.accentColor}
                  onChange={(e) => updateConfig('global.wikiportraits.accentColor', e.target.value)}
                  className="w-12 h-10 border border-border rounded cursor-pointer"
                />
                <input
                  type="text"
                  value={config.global.wikiportraits.accentColor}
                  onChange={(e) => updateConfig('global.wikiportraits.accentColor', e.target.value)}
                  className="flex-1 px-3 py-2 border border-border rounded-md text-sm font-mono"
                />
              </div>
            </div>

            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.wikiportraits.additionalBranding?.enabled || false}
                  onChange={(e) => updateConfig('global.wikiportraits.additionalBranding.enabled', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Enable additional branding (e.g., Wikimedia chapter support)</span>
              </label>
            </div>

            {config.global.wikiportraits.additionalBranding?.enabled && (
              <div className="ml-6 space-y-3 border-l-2 border-primary/20 pl-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Branding text:</label>
                  <input
                    type="text"
                    value={config.global.wikiportraits.additionalBranding?.text || ''}
                    onChange={(e) => updateConfig('global.wikiportraits.additionalBranding.text', e.target.value)}
                    placeholder="e.g., Supported by Wikimedia Norge"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo image (Commons filename):</label>
                  <input
                    type="text"
                    value={config.global.wikiportraits.additionalBranding?.logoImage || ''}
                    onChange={(e) => updateConfig('global.wikiportraits.additionalBranding.logoImage', e.target.value)}
                    placeholder="e.g., Wikimedia Norge-logo svart nb.svg"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm font-mono"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Logo link URL:</label>
                  <input
                    type="url"
                    value={config.global.wikiportraits.additionalBranding?.logoLink || ''}
                    onChange={(e) => updateConfig('global.wikiportraits.additionalBranding.logoLink', e.target.value)}
                    placeholder="e.g., https://wikimedia.no/"
                    className="w-full px-3 py-2 border border-border rounded-md text-sm"
                  />
                </div>
              </div>
            )}
          </div>
        </Section>

        {/* Depicts Configuration */}
        <Section title="Structured Data (Depicts)" id="depicts">
          <div className="space-y-4">
            <div>
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.global.depicts.autoAddDepicts}
                  onChange={(e) => updateConfig('global.depicts.autoAddDepicts', e.target.checked)}
                  className="w-4 h-4 text-primary rounded"
                />
                <span className="text-sm">Auto-add depicts statements (P180) when publishing</span>
              </label>
            </div>

            {config.global.depicts.autoAddDepicts && (
              <div className="ml-6 space-y-2">
                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.global.depicts.alwaysDepictOrganization}
                      onChange={(e) => updateConfig('global.depicts.alwaysDepictOrganization', e.target.checked)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <span className="text-sm">Always include band/organization</span>
                  </label>
                </div>

                <div>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.global.depicts.alwaysDepictPerformers}
                      onChange={(e) => updateConfig('global.depicts.alwaysDepictPerformers', e.target.checked)}
                      className="w-4 h-4 text-primary rounded"
                    />
                    <span className="text-sm">Always include tagged performers</span>
                  </label>
                </div>
              </div>
            )}
          </div>
        </Section>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <button
          onClick={handleReset}
          className="px-4 py-2 text-sm text-destructive hover:bg-destructive/10 rounded-lg flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          Reset to Defaults
        </button>

        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm bg-muted hover:bg-muted/80 rounded-lg"
            >
              Cancel
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 text-sm bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg flex items-center gap-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? 'Saving...' : 'Save Configuration'}
          </button>
        </div>
      </div>
    </div>
  );
}
