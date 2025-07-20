'use client';

import { useWorkflow } from '../providers/WorkflowProvider';
import { useUniversalForm } from '@/providers/UniversalFormProvider';
import WikiPortraitsPane from '../panes/WikiPortraitsPane';
import EventTypePane from '../panes/EventTypePane';
import EventDetailsPane from '../panes/EventDetailsPane';
import BandPerformersPane from '../panes/BandPerformersPane';
import CategoriesPane from '../panes/CategoriesPane';
import ImagesPane from '../panes/ImagesPane';
import TemplatesPane from '../panes/TemplatesPane';
import WikidataPane from '../panes/WikidataPane';
import UploadPane from '../panes/UploadPane';

export default function WorkflowStep() {
  const { watch } = useUniversalForm();
  const eventType = watch('workflowType') === 'music-event' ? 'festival' : 'general';
  
  const { 
    activeTab, 
    handleWikiPortraitsComplete,
    handleEventTypeComplete, 
    handleEventDetailsComplete, 
    handleBandPerformersComplete, 
    handleCategoriesComplete, 
    handleTemplatesComplete, 
    handleImagesComplete 
  } = useWorkflow();

  const renderWikipediaPlaceholder = () => (
    <div className="space-y-6">
      <div className="text-center">
        <div className="text-6xl mb-4">📖</div>
        <h3 className="text-xl font-semibold text-card-foreground mb-2">Wikipedia</h3>
        <p className="text-muted-foreground">
          Update Wikipedia articles with your event information
        </p>
      </div>
      
      {!eventType ? (
        <div className="bg-warning/10 border border-warning/20 rounded-lg p-4">
          <p className="text-warning font-medium">⚠️ Event Information Required</p>
          <p className="text-muted-foreground text-sm mt-1">
            Please complete the event setup steps to update Wikipedia articles.
          </p>
        </div>
      ) : (
        <div className="bg-info/10 border border-info/20 rounded-lg p-4">
          <p className="text-info font-medium">🚧 Wikipedia - Coming Soon</p>
          <p className="text-muted-foreground text-sm mt-1">
            This step will help you update relevant Wikipedia articles with event information.
          </p>
        </div>
      )}
    </div>
  );

  const renderActiveStep = () => {
    switch (activeTab) {
      case 'wiki-portraits':
        return (
          <WikiPortraitsPane
            onComplete={handleWikiPortraitsComplete}
          />
        );

      case 'event-type':
        return (
          <EventTypePane
            onComplete={handleEventTypeComplete}
          />
        );

      case 'event-details':
        return (
          <EventDetailsPane
            onComplete={handleEventDetailsComplete}
          />
        );

      case 'band-performers':
        return (
          <BandPerformersPane
            onComplete={handleBandPerformersComplete}
          />
        );

      case 'categories':
        return (
          <CategoriesPane
            onComplete={handleCategoriesComplete}
          />
        );

      case 'images':
        return (
          <ImagesPane
            onComplete={handleImagesComplete}
          />
        );

      case 'templates':
        return (
          <TemplatesPane
            onComplete={handleTemplatesComplete}
          />
        );

      case 'wikidata':
        return (
          <WikidataPane
            onComplete={() => console.log('Wikidata completed!')}
          />
        );

      case 'wikipedia':
        return renderWikipediaPlaceholder();

      case 'upload':
        return (
          <UploadPane
            onComplete={() => console.log('Upload completed!')}
          />
        );

      default:
        return <div>Select a step to continue</div>;
    }
  };

  return (
    <div className="bg-card rounded-lg shadow-sm border border-border p-6">
      <div className="space-y-6">
        {renderActiveStep()}
      </div>
    </div>
  );
}