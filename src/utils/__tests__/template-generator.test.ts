import { generateTemplateName, generateTemplate } from '../template-generator'

describe('template-generator utility', () => {
  const mockMusicEventData = {
    eventType: 'festival' as const,
    festivalData: {
      festival: {
        id: 'test-festival',
        name: 'Test Festival',
        year: '2024',
        location: 'Test City',
        country: 'Test Country'
      },
      selectedBands: [
        { id: 'band1', name: 'Test Band', wikipediaUrl: '' }
      ],
      authorUsername: 'testuser',
      authorFullName: 'Test User',
      addToWikiPortraitsConcerts: false
    }
  }

  const mockSoccerMatchData = {
    homeTeam: 'Test Team',
    awayTeam: 'Other Team', 
    date: '2024-01-01',
    venue: 'Test Stadium',
    competition: 'Test League'
  }

  describe('generateTemplateName', () => {
    it('generates template name for music events', () => {
      const templateName = generateTemplateName('music', mockMusicEventData, null)
      expect(templateName).toBe('WikiPortraits at Test Festival 2024')
    })

    it('generates template name for soccer events', () => {
      const templateName = generateTemplateName('soccer', null, mockSoccerMatchData)
      expect(templateName).toBe('WikiPortraits at Test Team vs Other Team 2024-01-01')
    })

    it('generates template name for general uploads', () => {
      const templateName = generateTemplateName('general', null, null)
      expect(templateName).toBe('WikiPortraits at Event')
    })

    it('generates template name for portraits', () => {
      const templateName = generateTemplateName('portraits', null, null)
      expect(templateName).toBe('WikiPortraits at Event')
    })
  })

  describe('generateTemplate', () => {
    it('generates template content for music events', () => {
      const template = generateTemplate('music', mockMusicEventData, null)
      expect(template).toContain('WikiPortraits')
      expect(template).toContain('Test Festival 2024')
      expect(template).toContain('{{WikiPortraits')
      expect(template).toContain('|title =')
      expect(template).toContain('|photocat =')
      expect(template).toContain('|accent =')
    })

    it('generates template content for soccer events', () => {
      const template = generateTemplate('soccer', null, mockSoccerMatchData)
      expect(template).toContain('WikiPortraits')
      expect(template).toContain('Test Team vs Other Team')
      expect(template).toContain('{{WikiPortraits')
      expect(template).toContain('#4CAF50') // soccer accent color
    })

    it('generates template content for general uploads', () => {
      const template = generateTemplate('general', null, null)
      expect(template).toContain('WikiPortraits')
      expect(template).toContain('{{WikiPortraits')
      expect(template).toContain('|title = Event')
      expect(template).toContain('#6B73FF') // default accent color
    })

    it('includes proper WikiPortraits template structure', () => {
      const template = generateTemplate('general', null, null)
      expect(template).toContain('{{WikiPortraits')
      expect(template).toContain('|title =')
      expect(template).toContain('|photocat =')
      expect(template).toContain('|accent =')
      expect(template).toContain('<includeonly>')
      expect(template).toContain('<noinclude>')
      expect(template).toContain('{{Documentation}}')
    })
  })
})