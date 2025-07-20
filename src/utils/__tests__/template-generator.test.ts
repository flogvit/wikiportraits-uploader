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


  describe('generateTemplateName', () => {
    it('generates template name for music events', () => {
      const templateName = generateTemplateName('music', mockMusicEventData, null)
      expect(templateName).toBe('WikiPortraits at Test Festival 2024')
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

    it('includes proper WikiPortraits template structure', () => {
      const template = generateTemplate('music', mockMusicEventData, null)
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