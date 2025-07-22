import { WikidataEntity, WikidataClaim, WD_PROPERTIES } from '@/types/wikidata';

/**
 * Base class for all Wikidata entities with common utility methods
 */
export class WDEntity {
  constructor(protected entity: WikidataEntity) {}

  // Basic getters
  get id(): string {
    return this.entity.id;
  }

  get type(): 'item' | 'property' {
    return this.entity.type;
  }

  get rawEntity(): WikidataEntity {
    return this.entity;
  }

  // Label methods
  getLabel(language: string = 'en'): string | undefined {
    return this.entity.labels?.[language]?.value;
  }

  setLabel(value: string, language: string = 'en'): void {
    if (!this.entity.labels) {
      this.entity.labels = {};
    }
    this.entity.labels[language] = { language, value };
  }

  // Description methods
  getDescription(language: string = 'en'): string | undefined {
    return this.entity.descriptions?.[language]?.value;
  }

  setDescription(value: string, language: string = 'en'): void {
    if (!this.entity.descriptions) {
      this.entity.descriptions = {};
    }
    this.entity.descriptions[language] = { language, value };
  }

  // Claim utility methods
  protected getClaim(property: string): WikidataClaim | undefined {
    return this.entity.claims?.[property]?.[0];
  }

  protected getClaims(property: string): WikidataClaim[] {
    return this.entity.claims?.[property] || [];
  }

  protected getClaimValue(property: string): any {
    const claim = this.getClaim(property);
    return claim?.mainsnak?.datavalue?.value;
  }

  protected getClaimValues(property: string): any[] {
    const claims = this.getClaims(property);
    return claims
      .map(claim => claim?.mainsnak?.datavalue?.value)
      .filter(value => value !== undefined);
  }

  protected setClaim(property: string, value: any, datatype: string = 'string'): void {
    if (!this.entity.claims) {
      this.entity.claims = {};
    }

    const claim: WikidataClaim = {
      id: `${this.entity.id}$${property}-${Date.now()}`,
      type: 'statement',
      rank: 'normal',
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value,
          type: datatype
        }
      }
    };

    this.entity.claims[property] = [claim];
  }

  protected addClaim(property: string, value: any, datatype: string = 'string'): void {
    if (!this.entity.claims) {
      this.entity.claims = {};
    }
    if (!this.entity.claims[property]) {
      this.entity.claims[property] = [];
    }

    const claim: WikidataClaim = {
      id: `${this.entity.id}$${property}-${Date.now()}`,
      type: 'statement',
      rank: 'normal',
      mainsnak: {
        snaktype: 'value',
        property,
        datavalue: {
          value,
          type: datatype
        }
      }
    };

    this.entity.claims[property].push(claim);
  }

  // Instance of methods
  getInstanceOf(): string[] {
    return this.getClaimValues(WD_PROPERTIES.INSTANCE_OF)
      .map(val => val.id || val)
      .filter(Boolean);
  }

  isInstanceOf(qid: string): boolean {
    return this.getInstanceOf().includes(qid);
  }

  setInstanceOf(qid: string): void {
    this.setClaim(WD_PROPERTIES.INSTANCE_OF, { id: qid, 'entity-type': 'item' }, 'wikibase-entityid');
  }

  // Image methods
  getImage(): string | undefined {
    return this.getClaimValue(WD_PROPERTIES.IMAGE);
  }

  setImage(imageUrl: string): void {
    this.setClaim(WD_PROPERTIES.IMAGE, imageUrl);
  }

  // Wikipedia/sitelink methods
  getWikipediaUrl(language: string = 'en'): string | undefined {
    const sitekey = `${language}wiki`;
    const sitelink = this.entity.sitelinks?.[sitekey];
    return sitelink ? `https://${language}.wikipedia.org/wiki/${sitelink.title}` : undefined;
  }

  setWikipediaTitle(title: string, language: string = 'en'): void {
    if (!this.entity.sitelinks) {
      this.entity.sitelinks = {};
    }
    const sitekey = `${language}wiki`;
    this.entity.sitelinks[sitekey] = {
      site: sitekey,
      title
    };
  }

  // Country methods
  getCountry(): string | undefined {
    const countryValue = this.getClaimValue(WD_PROPERTIES.COUNTRY);
    return countryValue?.id || countryValue;
  }

  setCountry(countryQid: string): void {
    this.setClaim(WD_PROPERTIES.COUNTRY, { id: countryQid, 'entity-type': 'item' }, 'wikibase-entityid');
  }
}