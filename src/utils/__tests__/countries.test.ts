import { countries, getCountryByCode, getCountryByName } from '../countries'

describe('countries utility', () => {
  it('exports an array of countries', () => {
    expect(Array.isArray(countries)).toBe(true)
    expect(countries.length).toBeGreaterThan(0)
  })

  it('country objects have required properties', () => {
    const country = countries[0]
    expect(country).toHaveProperty('code')
    expect(country).toHaveProperty('name')
    expect(typeof country.code).toBe('string')
    expect(typeof country.name).toBe('string')
  })

  it('getCountryByCode returns correct country', () => {
    const country = getCountryByCode('US')
    expect(country).toBeDefined()
    expect(country?.code).toBe('US')
    expect(country?.name).toBe('United States')
  })

  it('getCountryByCode returns undefined for invalid code', () => {
    const country = getCountryByCode('INVALID')
    expect(country).toBeUndefined()
  })

  it('getCountryByName returns correct country', () => {
    const country = getCountryByName('United States')
    expect(country).toBeDefined()
    expect(country?.code).toBe('US')
    expect(country?.name).toBe('United States')
  })

  it('getCountryByName returns undefined for invalid name', () => {
    const country = getCountryByName('Invalid Country')
    expect(country).toBeUndefined()
  })

  it('getCountryByName is case insensitive', () => {
    const country = getCountryByName('united states')
    expect(country).toBeDefined()
    expect(country?.code).toBe('US')
  })
})