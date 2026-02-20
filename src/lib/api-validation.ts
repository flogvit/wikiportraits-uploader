import { z } from 'zod';
import { NextResponse } from 'next/server';

// --- Helper ---

export function parseBody<T>(
  schema: z.ZodSchema<T>,
  data: unknown
): { success: true; data: T } | { success: false; response: NextResponse } {
  const result = schema.safeParse(data);
  if (result.success) {
    return { success: true, data: result.data };
  }
  const message = result.error.issues.map((i) => i.message).join('; ');
  return {
    success: false,
    response: NextResponse.json({ error: message }, { status: 400 }),
  };
}

// --- Commons schemas ---

export const createCategorySchema = z.object({
  categoryName: z.string().min(1, 'Category name is required'),
  parentCategory: z.string().optional(),
  description: z.string().optional(),
  teamName: z.string().optional(),
  additionalParents: z.array(z.string()).optional(),
});

export const createTemplateSchema = z.object({
  templateName: z.string().min(1, 'Template name is required'),
  content: z.string().optional(),
  templateCode: z.string().optional(),
  summary: z.string().optional(),
});

export const editPageSchema = z.object({
  filename: z.string().min(1, 'Filename is required'),
  wikitext: z.string().min(1, 'Wikitext is required'),
  summary: z.string().optional(),
});

export const updateCaptionsSchema = z.object({
  pageId: z.number({ required_error: 'pageId is required' }),
  captions: z.array(
    z.object({
      language: z.string(),
      text: z.string(),
    })
  ),
});

export const updateDepictsSchema = z.object({
  pageId: z.number({ required_error: 'pageId is required' }),
  depicts: z.array(
    z.object({
      qid: z.string(),
      label: z.string(),
    })
  ),
});

export const uploadMetadataSchema = z.object({
  description: z.string().optional(),
  author: z.string().optional(),
  date: z.string().optional(),
  source: z.string().optional(),
  license: z.string().optional(),
  categories: z.array(z.string()).optional(),
  event: z.string().optional(),
  location: z.string().optional(),
  filename: z.string().optional(),
});

// --- Wikidata schemas ---

export const createEntitySchema = z.object({
  entity: z.any().optional(),
  entityData: z
    .object({
      name: z.string().optional(),
      type: z.string().optional(),
      description: z.string().optional(),
      data: z.record(z.unknown()).optional(),
    })
    .passthrough()
    .optional(),
  accessToken: z.string().optional(),
}).refine((d) => d.entity !== undefined || d.entityData !== undefined, {
  message: 'Entity data is required',
});

export const batchCreateEntitySchema = z.object({
  entities: z.array(z.any()).min(1, 'Entities array is required'),
  accessToken: z.string().min(1, 'Access token is required'),
});

export const createClaimSchema = z.object({
  entityId: z.string().min(1, 'entityId is required'),
  propertyId: z.string().min(1, 'propertyId is required'),
  value: z.any().refine((v) => v !== undefined && v !== null, {
    message: 'value is required',
  }),
});

export const updateInfoboxSchema = z.object({
  lang: z.string().min(1, 'lang is required'),
  title: z.string().min(1, 'title is required'),
  image: z.string().min(1, 'image is required'),
  summary: z.string().min(1, 'summary is required'),
});

// --- Wikidata query-param schemas ---

export const wikidataSearchSchema = z.object({
  q: z.string().min(1, 'Query parameter is required'),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const wikidataGetEntitySchema = z.object({
  id: z.string().min(1, 'ID parameter is required'),
});
