import { NextRequest, NextResponse } from 'next/server';
import { PendingWikidataEntity, PendingBandMemberData } from '@/types/music';
import { createWikidataEntity, getUserPermissions } from '@/utils/wikidata';

export async function POST(request: NextRequest) {
  try {
    const { entity, accessToken } = await request.json();
    
    if (!entity || !accessToken) {
      return NextResponse.json({ error: 'Entity and access token are required' }, { status: 400 });
    }

    // Validate the entity
    const validatedEntity = validateEntity(entity);
    if (!validatedEntity.valid) {
      return NextResponse.json({ error: validatedEntity.error }, { status: 400 });
    }

    // Create the entity in Wikidata
    const result = await createWikidataEntity(entity, accessToken);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error creating Wikidata entity:', error);
    return NextResponse.json({ error: 'Failed to create entity' }, { status: 500 });
  }
}

function validateEntity(entity: PendingWikidataEntity): { valid: boolean; error?: string } {
  if (!entity.name || !entity.name.trim()) {
    return { valid: false, error: 'Entity name is required' };
  }

  if (!entity.type || !['band', 'band_member', 'photographer'].includes(entity.type)) {
    return { valid: false, error: 'Invalid entity type' };
  }

  return { valid: true };
}

async function createWikidataEntityRequest(entity: PendingWikidataEntity, accessToken: string) {
  console.log('Creating Wikidata entity on test.wikidata.org:', entity);
  
  // Build the entity data based on type
  let entityData;
  if (entity.type === 'band') {
    entityData = await createBandEntity(entity);
  } else if (entity.type === 'band_member') {
    entityData = await createBandMemberEntity(entity);
  } else if (entity.type === 'artist') {
    entityData = await createPhotographerEntity(entity);
  }

  try {
    console.log('Entity data to be sent:', JSON.stringify(entityData, null, 2));
    
    // Check user permissions
    const permissions = await getUserPermissions(accessToken);
    console.log('User permissions:', permissions);
    
    // Create the entity using utility
    const result = await createWikidataEntityRequest(entityData, accessToken);
    console.log('Wikidata API response:', result);
    
    if (result.success && result.entity) {
      return {
        success: true,
        wikidataId: result.entity.id,
        entity: result.entity,
        message: `${entity.type === 'band' ? 'Band' : entity.type === 'band_member' ? 'Band member' : 'Photographer'} "${entity.name}" created successfully on wikidata.org`,
        wikidataUrl: `https://www.wikidata.org/wiki/${result.entity.id}`
      };
    } else {
      throw new Error('Unexpected response format from Wikidata API');
    }
  } catch (error) {
    console.error('Error creating Wikidata entity:', error);
    throw error;
  }
}

async function createBandEntity(entity: PendingWikidataEntity) {
  
  // This would be the actual Wikidata API call structure
  const entityStructure = {
    labels: {
      en: { language: 'en', value: entity.name }
    },
    descriptions: {
      en: { language: 'en', value: entity.description || `${entity.name} is a band` }
    },
    claims: {
      // P31: instance of - Q215380 (musical group)
      P31: [{
        mainsnak: {
          snaktype: 'value',
          property: 'P31',
          datavalue: {
            value: { 'entity-type': 'item', id: 'Q215380' },
            type: 'wikibase-entityid'
          }
        }
      }],
      // Add more properties as needed (country, formed date, etc.)
    }
  };
  
  console.log('Band entity structure:', entityStructure);
  
  // Here you would make the actual API call to Wikidata
  // const response = await fetch('https://www.wikidata.org/w/api.php', {
  //   method: 'POST',
  //   headers: {
  //     'Authorization': `Bearer ${accessToken}`,
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     action: 'wbeditentity',
  //     new: 'item',
  //     data: JSON.stringify(entityStructure),
  //     format: 'json'
  //   })
  // });
  
  return entityStructure;
}

async function createBandMemberEntity(entity: PendingWikidataEntity) {
  const memberData = entity.data as PendingBandMemberData;
  
  // Comprehensive Wikidata structure for musicians/persons based on WikiPortraits requirements
  const entityStructure = {
    labels: {
      en: { language: 'en', value: entity.name }
    },
    descriptions: {
      en: { language: 'en', value: entity.description || `${entity.name} is a musician` }
    },
    // Add "Also known as" aliases if legal name is provided
    aliases: memberData.legalName ? {
      en: [{ language: 'en', value: memberData.legalName }]
    } : undefined,
    
    claims: {
      // P31: instance of - Q5 (human) - MANDATORY
      P31: [{
        mainsnak: {
          snaktype: 'value',
          property: 'P31',
          datavalue: {
            value: { 'entity-type': 'item', id: 'Q5' },
            type: 'wikibase-entityid'
          }
        }
      }],
      
      // P21: sex or gender - MANDATORY per WikiPortraits
      P21: [{
        mainsnak: {
          snaktype: 'value',
          property: 'P21',
          datavalue: {
            value: { 'entity-type': 'item', id: getGenderId(memberData.gender) },
            type: 'wikibase-entityid'
          }
        }
      }],
      
      // P106: occupation - Q639669 (musician) - MANDATORY
      P106: [{
        mainsnak: {
          snaktype: 'value',
          property: 'P106',
          datavalue: {
            value: { 'entity-type': 'item', id: 'Q639669' },
            type: 'wikibase-entityid'
          }
        }
      }],
      
      // P1303: instrument (if specified)
      ...(memberData.instruments && memberData.instruments.length > 0 ? {
        P1303: memberData.instruments.map(instrument => ({
          mainsnak: {
            snaktype: 'value',
            property: 'P1303',
            datavalue: {
              value: { 'entity-type': 'item', id: getInstrumentId(instrument) },
              type: 'wikibase-entityid'
            }
          }
        }))
      } : {}),
      
      // P463: member of (band membership)
      ...(memberData.bandId && !memberData.bandId.startsWith('pending-') ? {
        P463: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P463',
            datavalue: {
              value: { 'entity-type': 'item', id: memberData.bandId },
              type: 'wikibase-entityid'
            }
          }
        }]
      } : {}),
      
      // Additional properties for comprehensive person records:
      
      // P27: country of citizenship (if specified)
      ...(memberData.nationality ? {
        P27: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P27',
            datavalue: {
              value: { 'entity-type': 'item', id: getCountryId(memberData.nationality) },
              type: 'wikibase-entityid'
            }
          }
        }]
      } : {}),
      
      // P569: date of birth (if birth date is specified)
      ...(memberData.birthDate ? {
        P569: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P569',
            datavalue: {
              value: {
                time: memberData.birthDate,
                timezone: 0,
                before: 0,
                after: 0,
                precision: 9, // year precision
                calendarmodel: 'http://www.wikidata.org/entity/Q1985727'
              },
              type: 'time'
            }
          }
        }]
      } : {}),
      
      // P136: genre (could be added based on band genre)
      // P264: record label (could be added if known)
      // P1303: instrument (already handled above)
      // P2031: work period (start) - when they joined the band
      // P2032: work period (end) - if they left the band
    }
  };
  
  console.log('Band member entity structure:', entityStructure);
  
  return entityStructure;
}

// Helper function to map instrument names to Wikidata IDs
function getInstrumentId(instrument: string): string {
  const instrumentMap: { [key: string]: string } = {
    'guitar': 'Q6607',
    'bass': 'Q46185',
    'vocals': 'Q27939',
    'drums': 'Q128309',
    'piano': 'Q5994',
    'keyboard': 'Q52954',
    // Add more instruments as needed
  };
  
  return instrumentMap[instrument.toLowerCase()] || 'Q34379'; // Default to musical instrument
}

// Helper function to map country names to Wikidata IDs
function getCountryId(country: string): string {
  const countryMap: { [key: string]: string } = {
    'norway': 'Q20',
    'sweden': 'Q34',
    'denmark': 'Q35',
    'finland': 'Q33',
    'iceland': 'Q189',
    'germany': 'Q183',
    'france': 'Q142',
    'united kingdom': 'Q145',
    'uk': 'Q145',
    'united states': 'Q30',
    'usa': 'Q30',
    'canada': 'Q16',
    'australia': 'Q408',
    'japan': 'Q17',
    'south korea': 'Q884',
    'china': 'Q148',
    'russia': 'Q159',
    'italy': 'Q38',
    'spain': 'Q29',
    'netherlands': 'Q55',
    'belgium': 'Q31',
    'austria': 'Q40',
    'switzerland': 'Q39',
    'poland': 'Q36',
    'brazil': 'Q155',
    'argentina': 'Q414',
    'mexico': 'Q96',
    'india': 'Q668',
    // Add more countries as needed
  };
  
  return countryMap[country.toLowerCase()] || 'Q6256'; // Default to country
}

// Helper function to map gender values to Wikidata IDs
function getGenderId(gender?: string): string {
  const genderMap: { [key: string]: string } = {
    'male': 'Q6581097',
    'female': 'Q6581072',
    'non-binary gender': 'Q48270',
    'trans man': 'Q2449503',
    'trans woman': 'Q1052281',
    'unknown': 'Q48277',
  };
  
  return genderMap[gender || ''] || 'Q48277'; // Default to unknown if not specified
}

async function createPhotographerEntity(entity: PendingWikidataEntity) {
  const photographerData = entity.data as unknown as Record<string, unknown>;
  
  // Minimum viable photographer entity based on Q135336656 structure
  const entityStructure = {
    labels: {
      en: { language: 'en', value: entity.name }
    },
    descriptions: {
      en: { language: 'en', value: entity.description || `${entity.name} is a photographer` }
    },
    
    claims: {
      // P31: instance of - Q5 (human) - MANDATORY
      P31: [{
        mainsnak: {
          snaktype: 'value',
          property: 'P31',
          datavalue: {
            value: { 'entity-type': 'item', id: 'Q5' },
            type: 'wikibase-entityid'
          }
        },
        type: 'statement'
      }],
      
      // P106: occupation - Q33231 (photographer) - MANDATORY
      P106: [{
        mainsnak: {
          snaktype: 'value',
          property: 'P106',
          datavalue: {
            value: { 'entity-type': 'item', id: 'Q33231' },
            type: 'wikibase-entityid'
          }
        },
        type: 'statement'
      }],
      
      // P21: sex or gender - Default to "unknown" (Q48277) if not specified
      P21: [{
        mainsnak: {
          snaktype: 'value',
          property: 'P21',
          datavalue: {
            value: { 'entity-type': 'item', id: photographerData?.gender ? getGenderId(photographerData.gender as string) : 'Q48277' },
            type: 'wikibase-entityid'
          }
        },
        type: 'statement'
      }],
      
      // P27: country of citizenship - Try to infer from session or set to unknown
      ...(photographerData?.nationality ? {
        P27: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P27',
            datavalue: {
              value: { 'entity-type': 'item', id: getCountryId(photographerData.nationality as string) },
              type: 'wikibase-entityid'
            }
          },
          type: 'statement'
        }]
      } : {}),
      
      // P4174: Wikimedia username (if available)
      ...(photographerData?.wikimediaUsername ? {
        P4174: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P4174',
            datavalue: {
              value: photographerData.wikimediaUsername,
              type: 'string'
            }
          },
          type: 'statement'
        }]
      } : {}),
      
      // P856: official website (if specified)
      ...(photographerData?.website ? {
        P856: [{
          mainsnak: {
            snaktype: 'value',
            property: 'P856',
            datavalue: {
              value: photographerData.website,
              type: 'string'
            }
          },
          type: 'statement'
        }]
      } : {}),
    }
  };
  
  console.log('Photographer entity structure (minimal):', entityStructure);
  
  return entityStructure;
}

// Helper function to map language names to Wikidata IDs
/*
function getLanguageId(language: string): string {
  const languageMap: { [key: string]: string } = {
    'english': 'Q1860',
    'german': 'Q188',
    'french': 'Q150',
    'spanish': 'Q1321',
    'italian': 'Q652',
    'portuguese': 'Q5146',
    'dutch': 'Q7411',
    'swedish': 'Q9027',
    'norwegian': 'Q9043',
    'danish': 'Q9035',
    'finnish': 'Q1412',
    'icelandic': 'Q294',
    'russian': 'Q7737',
    'chinese': 'Q7850',
    'japanese': 'Q5287',
    'korean': 'Q9176',
    'arabic': 'Q13955',
    'hindi': 'Q1568',
    // Add more languages as needed
  };
  
  return languageMap[language.toLowerCase()] || 'Q1860'; // Default to English
}
*/

// Batch creation endpoint
export async function PATCH(request: NextRequest) {
  try {
    const { entities, accessToken } = await request.json();
    
    if (!entities || !Array.isArray(entities) || !accessToken) {
      return NextResponse.json({ error: 'Entities array and access token are required' }, { status: 400 });
    }

    const results = [];
    
    // Process entities in sequence to avoid rate limiting
    for (const entity of entities) {
      try {
        const result = await createWikidataEntityRequest(entity, accessToken);
        results.push({
          entityId: entity.id,
          success: true,
          ...result
        });
      } catch (error) {
        results.push({
          entityId: entity.id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }
    
    return NextResponse.json({
      success: true,
      results,
      total: entities.length,
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length
    });
  } catch (error) {
    console.error('Error in batch entity creation:', error);
    return NextResponse.json({ error: 'Failed to create entities' }, { status: 500 });
  }
}