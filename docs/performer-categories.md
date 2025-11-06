# Performer Category Management

This document describes how the system handles Commons categories for individual performers (band members, musicians, etc.) following Wikimedia best practices.

## Overview

When tagging images with individual performers, the system automatically determines the correct Commons category name for each person based on their Wikidata entry and existing Commons categories.

## Best Practices

According to Wikimedia Commons guidelines:

1. **Individual performers get their own category** - not a "Band Name members" category
2. **Use Wikidata P373 (Commons category) when available** - this is the authoritative category name
3. **Disambiguate when necessary** - use occupation or nationality if multiple people share the same name
4. **Check existing categories** - verify they link to the correct Wikidata entity

## Implementation

### Core Functions

The main logic is in `src/utils/performer-categories.ts`:

#### `getPerformerCategory(entity: WikidataEntity)`

Returns the appropriate Commons category for an individual performer. The function follows this decision tree:

1. **Check for P373 (Commons category) on Wikidata**
   - If found, use that exact category name
   - This is the highest priority source (confidence: 1.0)

2. **Check if base name is available**
   - If the category doesn't exist on Commons, use the person's name as-is
   - Creates the category with a link to their Wikidata item

3. **Verify existing category links to correct entity**
   - If category exists, check its Wikidata Infobox
   - If it links to the same entity, use it
   - If it links to a different entity, disambiguation is needed

4. **Generate disambiguated name**
   - Try occupation-based disambiguation first (e.g., "John Smith (singer)")
   - Fall back to nationality-based (e.g., "John Smith (Norwegian musician)")
   - Last resort: generic "musician" (e.g., "John Smith (musician)")

#### `extractCommonsCategory(entity: WikidataEntity)`

Extracts the P373 value from a Wikidata entity if it exists.

```typescript
const p373 = extractCommonsCategory(entity);
// Returns: "John Smith (singer)" or null
```

#### `addPerformerCategoriesToImage(existingCategories, performerEntities)`

Helper function to add performer categories to an image's category list. Use this when tagging images with specific performers.

```typescript
const updatedCategories = await addPerformerCategoriesToImage(
  image.metadata.categories,
  [performerEntity1, performerEntity2]
);
```

### Integration with Category Generation

The universal category generation system (`src/utils/category-generation.ts`) automatically uses performer category logic for all human entities (P31=Q5):

```typescript
// In generateFromEntities()
if (isPerformer(entity)) {
  const performerInfo = await getPerformerCategory(entity);
  categories.push({
    name: performerInfo.commonsCategory,
    source: 'performer-entity',
    type: 'auto',
    priority: 9,
    confidence: performerInfo.source === 'p373' ? 1.0 : 0.85
  });
}
```

### Disambiguation Logic

The disambiguation system handles several scenarios:

**Occupation-based** (most common for musicians):
- Guitarist → "Name (guitarist)"
- Singer → "Name (singer)"
- Drummer → "Name (drummer)"
- etc.

**Nationality-based** (when occupation isn't available):
- Norwegian → "Name (Norwegian musician)"
- American → "Name (American musician)"

**Common occupation Q-codes** are mapped in `getOccupationForDisambiguation()`:
- Q177220: singer
- Q855091: guitarist
- Q765778: bassist
- Q386854: drummer
- Q639669: musician
- etc.

## Examples

### Example 1: Performer with P373

```typescript
// Entity for Lars Ulrich has P373 = "Lars Ulrich"
const entity = await WikidataClient.getEntity('Q188626');
const category = await getPerformerCategory(entity);

// Result:
{
  performerName: "Lars Ulrich",
  performerQid: "Q188626",
  commonsCategory: "Lars Ulrich",  // From P373
  source: "p373",
  needsCreation: false
}
```

### Example 2: Performer without P373, unique name

```typescript
// Entity without P373, name doesn't conflict
const entity = await WikidataClient.getEntity('Q99999');
const category = await getPerformerCategory(entity);

// Result:
{
  performerName: "Unique Artist Name",
  performerQid: "Q99999",
  commonsCategory: "Unique Artist Name",  // Base name available
  source: "base",
  needsCreation: true
}
```

### Example 3: Performer without P373, needs disambiguation

```typescript
// Entity without P373, "John Smith" category already exists for different person
const entity = await WikidataClient.getEntity('Q88888');
const category = await getPerformerCategory(entity);

// Result:
{
  performerName: "John Smith",
  performerQid: "Q88888",
  commonsCategory: "John Smith (singer)",  // Disambiguated by occupation
  source: "disambiguated",
  needsCreation: true
}
```

## Usage Guidelines

### When tagging images with performers

Use the `addPerformerCategoriesToImage()` helper:

```typescript
import { addPerformerCategoriesToImage } from '@/utils/performer-categories';

// Get performer entities from your form data
const performerEntities = formData.entities?.people?.map(p => p.entity) || [];

// Add their categories to the image
const updatedCategories = await addPerformerCategoriesToImage(
  image.metadata.categories || [],
  performerEntities
);

// Update image metadata
updateImageMetadata({
  ...image.metadata,
  categories: updatedCategories
});
```

### When creating new categories

The category creation system will automatically:
1. Check if the category exists
2. Create it with proper Wikidata Infobox if needed
3. Link it to the correct Wikidata entity (QID)

### When adding P373 to existing Wikidata items

If a performer doesn't have P373 set on Wikidata, the system can help identify the correct category and you can add it to Wikidata for future use.

## API Reference

### Types

```typescript
interface PerformerCategoryInfo {
  performerName: string;        // Display name from Wikidata
  performerQid: string;          // Wikidata Q-ID
  commonsCategory: string;       // The category name to use
  source: 'p373' | 'disambiguated' | 'base';
  needsCreation: boolean;        // Whether category needs to be created
  description: string;           // Wikidata Infobox text
}
```

### Functions

- `getPerformerCategory(entity: WikidataEntity): Promise<PerformerCategoryInfo>`
- `getPerformerCategories(entities: WikidataEntity[]): Promise<PerformerCategoryInfo[]>`
- `extractCommonsCategory(entity: WikidataEntity): string | null`
- `isPerformer(entity: WikidataEntity): boolean`
- `addPerformerCategoriesToImage(categories: string[], entities: WikidataEntity[]): Promise<string[]>`
- `getPerformerCategoryNames(entities: WikidataEntity[]): Promise<string[]>`

## Future Enhancements

Potential improvements to consider:

1. **Cache P373 lookups** - reduce Wikidata API calls
2. **Batch category verification** - check multiple categories at once
3. **Suggest P373 additions** - when system determines correct category, suggest adding P373 to Wikidata
4. **Multi-language support** - handle categories in languages other than English
5. **Birth/death year disambiguation** - for historical figures with same name

## Related Documentation

- [Band Categories](./band-categories.md) - For band/group entities
- [Category Generation](./category-generation.md) - Universal category system
- [Wikidata Integration](./wikidata-integration.md) - Working with Wikidata entities
