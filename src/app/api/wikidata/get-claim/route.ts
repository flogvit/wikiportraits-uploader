import { NextRequest, NextResponse } from 'next/server';
import { getClaim } from '@/utils/wikidata-api';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const entityId = searchParams.get('entityId');
  const propertyId = searchParams.get('propertyId');

  if (!entityId || !propertyId) {
    return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
  }

  try {
    const result = await getClaim(entityId, propertyId);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
