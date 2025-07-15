import { NextRequest, NextResponse } from 'next/server';
import { getWikidataEntity, hasClaimValue } from '@/utils/wikidata';

interface WikidataEntity {
  id: string;
  label: string;
  description?: string;
  aliases?: string[];
  conceptUri: string;
  url: string;
  isHuman?: boolean;
  isPhotographer?: boolean;
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const language = searchParams.get('language') || 'en';
    
    if (!id) {
      return NextResponse.json({ error: 'Entity ID is required' }, { status: 400 });
    }

    // Get entity details using utility
    const entity = await getWikidataEntity(id, language);

    // Extract basic information
    const label = entity.labels?.[language]?.value || entity.labels?.en?.value || id;
    const description = entity.descriptions?.[language]?.value || entity.descriptions?.en?.value;
    const aliases = entity.aliases?.[language]?.map((alias: { value: string }) => alias.value) || [];

    // Check claims using utility functions
    const claims = entity.claims || {};
    const isHuman = hasClaimValue(claims, 'P31', 'Q5');
    const isPhotographer = hasClaimValue(claims, 'P106', 'Q33231');

    const result: WikidataEntity = {
      id,
      label,
      description,
      aliases,
      conceptUri: `http://www.wikidata.org/entity/${id}`,
      url: `https://www.wikidata.org/wiki/${id}`,
      isHuman,
      isPhotographer
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get entity error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch entity from Wikidata' },
      { status: 500 }
    );
  }
}