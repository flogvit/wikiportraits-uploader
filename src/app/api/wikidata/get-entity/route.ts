import { NextRequest, NextResponse } from 'next/server';
import { WikidataClient, WikidataHelpers } from '@/lib/api/WikidataClient';
import { checkRateLimit, getRateLimitKey, rateLimitResponse } from '@/utils/rate-limit';
import { logger } from '@/utils/logger';
import { parseBody, wikidataGetEntitySchema } from '@/lib/api-validation';

export async function GET(request: NextRequest) {
  try {
    const rl = checkRateLimit(getRateLimitKey(request, 'wikidata-get-entity'), { limit: 60 });
    if (!rl.success) return rateLimitResponse(rl);

    const { searchParams } = new URL(request.url);
    const parsed = parseBody(wikidataGetEntitySchema, {
      id: searchParams.get('id') || '',
    });
    if (!parsed.success) return parsed.response;
    const { id } = parsed.data;

    // Fetch entity from Wikidata
    const entity = await WikidataClient.getEntity(id);

    if (!entity) {
      return NextResponse.json({
        error: 'Entity not found'
      }, { status: 404 });
    }

    // Transform to match expected format
    const label = WikidataHelpers.getName(entity);
    const description = WikidataHelpers.getDescription(entity);
    const isHuman = WikidataHelpers.isInstanceOf(entity, 'Q5');
    const isPhotographer = checkIsPhotographer(entity);
    const aliases = entity.aliases?.en?.map(alias => alias.value) || [];

    const result = {
      id: entity.id,
      label,
      description: description || undefined,
      aliases: aliases.length > 0 ? aliases : undefined,
      conceptUri: `http://www.wikidata.org/entity/${entity.id}`,
      url: `https://www.wikidata.org/wiki/${entity.id}`,
      isHuman,
      isPhotographer
    };

    return NextResponse.json(result);

  } catch (error) {
    logger.error('wikidata/get-entity', 'Failed to fetch entity', error);
    return NextResponse.json({
      error: 'Failed to fetch entity',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}

function checkIsPhotographer(entity: any): boolean {
  const occupations = entity.claims?.P106 || [];

  const photographerOccupations = [
    'Q33231', // photographer
    'Q1930187', // photojournalist
    'Q33216', // portrait photographer
    'Q222344', // fashion photographer
    'Q1925963', // press photographer
    'Q2526255', // documentary photographer
  ];

  return occupations.some((claim: any) =>
    claim.mainsnak.datavalue?.value?.id &&
    photographerOccupations.includes(claim.mainsnak.datavalue.value.id)
  );
}
