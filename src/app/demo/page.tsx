'use client';

import { useState } from 'react';
import { WikidataEntity, WD_PROPERTIES } from '@/types/wikidata';
import WDOrganizationCard, { WDOrganizationCardCompact } from '@/components/common/WDOrganizationCard';
import WDOrganizationSelector from '@/components/selectors/WDOrganizationSelector';
import WDPersonCard from '@/components/common/WDPersonCard';
import WDEntitySelector from '@/components/selectors/WDEntitySelector';
import { logger } from '@/utils/logger';

// Mock organization data for demo
const mockBand: WikidataEntity = {
  id: 'Q2831',
  type: 'item',
  labels: { en: { language: 'en', value: 'The Beatles' } },
  descriptions: { en: { language: 'en', value: 'English rock band formed in Liverpool in 1960' } },
  claims: {
    [WD_PROPERTIES.INSTANCE_OF]: [{
      id: 'statement1',
      mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.BAND }, type: 'wikibase-entityid' } },
      type: 'statement',
      rank: 'normal'
    }],
    ['P17']: [{ // country
      id: 'statement2',
      mainsnak: { snaktype: 'value', property: 'P17', datavalue: { value: { id: 'Q145' }, type: 'wikibase-entityid' } }, // United Kingdom
      type: 'statement',
      rank: 'normal'
    }],
    ['P571']: [{ // inception date
      id: 'statement3',
      mainsnak: { snaktype: 'value', property: 'P571', datavalue: { value: { time: '+1960-00-00T00:00:00Z' }, type: 'time' } },
      type: 'statement',
      rank: 'normal'
    }]
  },
  sitelinks: {
    enwiki: { site: 'enwiki', title: 'The Beatles', badges: [] }
  }
};

const mockSoccerClub: WikidataEntity = {
  id: 'Q9616',
  type: 'item',
  labels: { en: { language: 'en', value: 'Chelsea F.C.' } },
  descriptions: { en: { language: 'en', value: 'English association football club' } },
  claims: {
    [WD_PROPERTIES.INSTANCE_OF]: [{
      id: 'statement1',
      mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.FOOTBALL_CLUB }, type: 'wikibase-entityid' } },
      type: 'statement',
      rank: 'normal'
    }],
    ['P17']: [{
      id: 'statement2',
      mainsnak: { snaktype: 'value', property: 'P17', datavalue: { value: { id: 'Q145' }, type: 'wikibase-entityid' } },
      type: 'statement',
      rank: 'normal'
    }],
    ['P571']: [{
      id: 'statement3',
      mainsnak: { snaktype: 'value', property: 'P571', datavalue: { value: { time: '+1905-00-00T00:00:00Z' }, type: 'time' } },
      type: 'statement',
      rank: 'normal'
    }]
  },
  sitelinks: {
    enwiki: { site: 'enwiki', title: 'Chelsea F.C.', badges: [] }
  }
};

const mockPerson: WikidataEntity = {
  id: 'Q1203',
  type: 'item',
  labels: { en: { language: 'en', value: 'John Lennon' } },
  descriptions: { en: { language: 'en', value: 'English musician and member of the Beatles' } },
  claims: {
    [WD_PROPERTIES.INSTANCE_OF]: [{
      id: 'statement1',
      mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTANCE_OF, datavalue: { value: { id: WD_PROPERTIES.HUMAN }, type: 'wikibase-entityid' } },
      type: 'statement',
      rank: 'normal'
    }],
    [WD_PROPERTIES.INSTRUMENT]: [{
      id: 'statement2',
      mainsnak: { snaktype: 'value', property: WD_PROPERTIES.INSTRUMENT, datavalue: { value: { id: 'Q6607' }, type: 'wikibase-entityid' } }, // guitar
      type: 'statement',
      rank: 'normal'
    }]
  }
};

export default function DemoPage() {
  const [selectedBand, setSelectedBand] = useState<WikidataEntity | null>(null);
  const [selectedClub, setSelectedClub] = useState<WikidataEntity | null>(null);
  const [selectedOrganization, setSelectedOrganization] = useState<WikidataEntity | null>(null);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Universal Organization Components Demo
        </h1>
        <p className="text-gray-600">
          Showcasing the new universal architecture with WDOrganizationCard and WDOrganizationSelector components
        </p>
      </div>

      <div className="space-y-8">
        {/* Organization Cards */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Organization Cards</h2>
          <div className="grid md:grid-cols-2 gap-6">
            
            {/* Band Card */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Music Band</h3>
              <WDOrganizationCard 
                entity={mockBand}
                variant="main"
                onRemove={(id) => logger.debug('demo', 'Remove band', id)}
                onClick={(id) => logger.debug('demo', 'Click band', id)}
              />
              
              {/* Compact version */}
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Compact Version</h4>
                <WDOrganizationCardCompact 
                  entity={mockBand}
                  selected={false}
                  onRemove={(id) => logger.debug('demo', 'Remove band compact', id)}
                  onClick={(id) => logger.debug('demo', 'Click band compact', id)}
                />
              </div>
            </div>

            {/* Soccer Club Card */}
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">Soccer Club</h3>
              <WDOrganizationCard 
                entity={mockSoccerClub}
                variant="additional"
                onRemove={(id) => logger.debug('demo', 'Remove club', id)}
                onClick={(id) => logger.debug('demo', 'Click club', id)}
              />
              
              {/* Compact version */}
              <div className="mt-3">
                <h4 className="text-sm font-medium text-gray-600 mb-2">Compact Version</h4>
                <WDOrganizationCardCompact 
                  entity={mockSoccerClub}
                  selected={true}
                  onRemove={(id) => logger.debug('demo', 'Remove club compact', id)}
                  onClick={(id) => logger.debug('demo', 'Click club compact', id)}
                />
              </div>
            </div>
          </div>
        </section>

        {/* Organization Selectors */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Organization Selectors</h2>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Band Selector */}
            <div>
              <WDOrganizationSelector
                organizationType={WD_PROPERTIES.BAND}
                value={selectedBand}
                onChange={setSelectedBand}
                placeholder="Search for bands..."
                label="Select Band"
                compact={false}
              />
            </div>

            {/* Soccer Club Selector */}
            <div>
              <WDOrganizationSelector
                organizationType={WD_PROPERTIES.FOOTBALL_CLUB}
                value={selectedClub}
                onChange={setSelectedClub}
                placeholder="Search for football clubs..."
                label="Select Club"
                compact={true}
              />
            </div>

            {/* General Organization Selector */}
            <div>
              <WDOrganizationSelector
                value={selectedOrganization}
                onChange={setSelectedOrganization}
                placeholder="Search for any organization..."
                label="Select Organization"
                compact={false}
              />
            </div>
          </div>
        </section>

        {/* Comparison with Person Cards */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Universal Component Architecture</h2>
          <p className="text-gray-600 mb-6">
            The same universal architecture pattern works across all entity types:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">WDPersonCard (Universal)</h3>
              <WDPersonCard 
                entity={mockPerson}
                variant="main"
                onRemove={(id) => logger.debug('demo', 'Remove person', id)}
                onClick={(id) => logger.debug('demo', 'Click person', id)}
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">WDOrganizationCard (Universal)</h3>
              <WDOrganizationCard 
                entity={mockBand}
                variant="main"
                onRemove={(id) => logger.debug('demo', 'Remove organization', id)}
                onClick={(id) => logger.debug('demo', 'Click organization', id)}
              />
            </div>
          </div>
        </section>

        {/* Real API Integration Demo */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Real API Integration</h2>
          <p className="text-gray-600 mb-6">
            These components use real Wikidata API calls with proper error handling:
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">WDEntitySelector (Any Entity)</h3>
              <WDEntitySelector
                entityType={WD_PROPERTIES.BAND}
                placeholder="Search real Wikidata entities..."
                label="Real API Search"
              />
            </div>
            
            <div>
              <h3 className="text-lg font-medium text-gray-700 mb-3">WDOrganizationSelector (Organizations)</h3>
              <WDOrganizationSelector
                organizationType={WD_PROPERTIES.BAND}
                placeholder="Search real organizations..."
                label="Real Organization Search"
                compact={true}
              />
            </div>
          </div>
        </section>

        {/* Architecture Benefits */}
        <section>
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">Architecture Benefits</h2>
          <div className="bg-gray-50 rounded-lg p-6">
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Universal Components</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Same WDOrganizationCard for bands, clubs, companies</li>
                  <li>• Same WDPersonCard for musicians, players, speakers</li>
                  <li>• Same WDEntitySelector for any Wikidata entity</li>
                  <li>• Consistent UI/UX across all domains</li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold text-gray-800 mb-3">Technical Excellence</h3>
                <ul className="space-y-2 text-gray-600">
                  <li>• Direct Wikidata entity manipulation</li>
                  <li>• Real-time API integration with fallbacks</li>
                  <li>• Type-safe utility functions</li>
                  <li>• Domain-agnostic with smart defaults</li>
                </ul>
              </div>
            </div>
          </div>
        </section>

        {/* Selection State */}
        {(selectedBand || selectedClub || selectedOrganization) && (
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 mb-4">Selected Organizations</h2>
            <div className="space-y-4">
              {selectedBand && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Selected Band</h3>
                  <WDOrganizationCard entity={selectedBand} variant="main" />
                </div>
              )}
              
              {selectedClub && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Selected Club</h3>
                  <WDOrganizationCard entity={selectedClub} variant="additional" />
                </div>
              )}
              
              {selectedOrganization && (
                <div>
                  <h3 className="text-lg font-medium text-gray-700 mb-2">Selected Organization</h3>
                  <WDOrganizationCard entity={selectedOrganization} variant="new" />
                </div>
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  );
}