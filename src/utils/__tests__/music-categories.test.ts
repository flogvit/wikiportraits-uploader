import { generateMusicCategories, getCategoriesToCreate } from '../music-categories'
import { MusicEventMetadata } from '@/types/music'

describe('music-categories utility', () => {
  const mockFestivalData: MusicEventMetadata = {
    eventType: 'festival',
    festivalData: {
      festival: {
        id: 'test-festival-1',
        name: 'Test Festival',
        year: '2024',
        location: 'Test City',
        country: 'Test Country',
        startDate: '2024-06-01',
        endDate: '2024-06-03',
        wikipediaUrl: 'https://en.wikipedia.org/wiki/Test_Festival'
      },
      selectedBands: [
        {
          id: 'test-band-1',
          name: 'Test Band 1',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Test_Band_1'
        },
        {
          id: 'test-band-2',
          name: 'Test Band 2',
          wikipediaUrl: ''
        }
      ],
      authorUsername: 'testuser',
      authorFullName: 'Test User',
      addToWikiPortraitsConcerts: true
    }
  }

  const mockConcertData: MusicEventMetadata = {
    eventType: 'concert',
    concertData: {
      concert: {
        id: 'test-concert-1',
        artist: {
          id: 'test-artist-1',
          name: 'Test Artist',
          wikipediaUrl: 'https://en.wikipedia.org/wiki/Test_Artist'
        },
        venue: 'Test Venue',
        city: 'Test City',
        country: 'Test Country',
        date: '2024-06-01',
        tour: 'Test Tour'
      },
      addToWikiPortraitsConcerts: true
    }
  }

  describe('generateMusicCategories', () => {
    it('generates categories for festival events', () => {
      const categories = generateMusicCategories({ eventData: mockFestivalData })
      
      expect(categories).toContain('WikiPortraits')
      expect(categories).toContain('WikiPortraits at Concerts')
      expect(categories).toContain('Test Festival 2024')
      expect(categories).toContain('Test Festival')
      expect(categories).toContain('Test Band 1')
      expect(categories).toContain('Test Band 2')
      expect(categories).toContain('Music festivals in Test City')
      expect(categories).toContain('Music festivals in Test Country')
      expect(categories).toContain('Music festivals in 2024')
    })

    it('generates categories for concert events', () => {
      const categories = generateMusicCategories({ eventData: mockConcertData })
      
      expect(categories).toContain('WikiPortraits')
      expect(categories).toContain('WikiPortraits at Concerts')
      expect(categories).toContain('Test Artist')
      expect(categories).toContain('Concerts at Test Venue')
      expect(categories).toContain('Concerts in Test City')
      expect(categories).toContain('Concerts in Test Country')
      expect(categories).toContain('Concerts in 2024')
      expect(categories).toContain('Test Tour tour')
      expect(categories).toContain('Test Artist tours')
    })

    it('excludes band categories when includeBandCategories is false', () => {
      const categories = generateMusicCategories({ 
        eventData: mockFestivalData,
        includeBandCategories: false
      })
      
      expect(categories).not.toContain('Test Band 1')
      expect(categories).not.toContain('Test Band 2')
      expect(categories).toContain('Test Festival 2024')
    })

    it('excludes event categories when includeEventCategories is false', () => {
      const categories = generateMusicCategories({ 
        eventData: mockFestivalData,
        includeEventCategories: false
      })
      
      expect(categories).not.toContain('Test Festival 2024')
      expect(categories).not.toContain('Music festivals in Test City')
      expect(categories).toContain('Test Band 1')
    })

    it('excludes WikiPortraits integration when disabled', () => {
      const categories = generateMusicCategories({ 
        eventData: mockFestivalData,
        includeWikiPortraitsIntegration: false
      })
      
      expect(categories).not.toContain('WikiPortraits at Concerts')
      expect(categories).toContain('WikiPortraits')
    })

    it('returns only WikiPortraits for empty event data', () => {
      const categories = generateMusicCategories({ eventData: null as any })
      
      expect(categories).toEqual(['WikiPortraits'])
    })
  })

  describe('getCategoriesToCreate', () => {
    it('returns categories to create for festival events', () => {
      const categoriesToCreate = getCategoriesToCreate(mockFestivalData)
      
      // Check for main festival categories
      expect(categoriesToCreate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryName: 'Test Festival 2024',
            shouldCreate: true,
            parentCategory: 'Test Festival',
            description: '[[Test Festival]] 2024 in Test City.'
          }),
          expect.objectContaining({
            categoryName: 'Test Festival',
            shouldCreate: true,
            parentCategory: 'WikiPortraits at Concerts',
            description: '[[Test Festival]] music festival.'
          }),
          expect.objectContaining({
            categoryName: 'WikiPortraits at Test Festival 2024',
            shouldCreate: true,
            parentCategory: 'WikiPortraits',
            description: 'WikiPortraits photos taken at [[Test Festival]] 2024.'
          })
        ])
      )
      
      // Should include band-specific categories
      expect(categoriesToCreate.length).toBe(7) // 3 main + 4 band categories
      
      // Check for band categories
      expect(categoriesToCreate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryName: 'Test Band 1 at Test Festival 2024',
            shouldCreate: true,
            parentCategory: 'Test Festival 2024'
          }),
          expect.objectContaining({
            categoryName: 'Test Band 1',
            shouldCreate: true
          })
        ])
      )
    })

    it('returns categories to create for concert events', () => {
      const categoriesToCreate = getCategoriesToCreate(mockConcertData)
      
      expect(categoriesToCreate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryName: 'Test Artist',
            shouldCreate: true,
            parentCategory: 'WikiPortraits at Concerts',
            description: expect.stringContaining('Test Artist')
          }),
          expect.objectContaining({
            categoryName: 'Concerts at Test Venue',
            shouldCreate: true,
            description: expect.stringContaining('Test Venue')
          })
        ])
      )
    })

    it('includes band-specific categories for festivals', () => {
      const categoriesToCreate = getCategoriesToCreate(mockFestivalData)
      
      expect(categoriesToCreate).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            categoryName: 'Test Band 1 at Test Festival 2024',
            shouldCreate: true,
            parentCategory: 'Test Festival 2024',
            description: expect.stringContaining('Test Band 1')
          }),
          expect.objectContaining({
            categoryName: 'Test Band 1',
            shouldCreate: true,
            description: expect.stringContaining('Test Band 1')
          })
        ])
      )
    })

    it('returns empty array for invalid event data', () => {
      const categoriesToCreate = getCategoriesToCreate({} as any)
      
      expect(categoriesToCreate).toEqual([])
    })
  })
})