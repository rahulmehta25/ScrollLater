import {
  entryFormSchema,
  editEntrySchema,
  profileSchema,
  searchQuerySchema,
  tagSchema,
  validateFormData,
} from '../validations'

describe('Validation Schemas', () => {
  describe('entryFormSchema', () => {
    it('validates valid entry data', () => {
      const validData = {
        content: 'This is a test entry',
        url: 'https://example.com',
        category: 'Todo',
        tags: ['test', 'example'],
        priority: 3,
      }
      
      const result = entryFormSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('requires content', () => {
      const invalidData = {
        content: '',
      }
      
      expect(() => entryFormSchema.parse(invalidData)).toThrow()
    })

    it('validates URL format', () => {
      const invalidData = {
        content: 'Test content',
        url: 'not-a-valid-url',
      }
      
      expect(() => entryFormSchema.parse(invalidData)).toThrow()
    })

    it('accepts empty URL', () => {
      const validData = {
        content: 'Test content',
        url: '',
      }
      
      const result = entryFormSchema.parse(validData)
      expect(result.url).toBe('')
    })
  })

  describe('profileSchema', () => {
    it('validates valid profile data', () => {
      const validData = {
        display_name: 'John Doe',
        timezone: 'America/New_York',
        default_block_duration: 30,
        auto_schedule_enabled: true,
      }
      
      const result = profileSchema.parse(validData)
      expect(result).toEqual(validData)
    })

    it('enforces duration limits', () => {
      const tooShort = {
        display_name: 'John',
        timezone: 'UTC',
        default_block_duration: 10,
        auto_schedule_enabled: false,
      }
      
      expect(() => profileSchema.parse(tooShort)).toThrow()
      
      const tooLong = {
        display_name: 'John',
        timezone: 'UTC',
        default_block_duration: 300,
        auto_schedule_enabled: false,
      }
      
      expect(() => profileSchema.parse(tooLong)).toThrow()
    })
  })

  describe('tagSchema', () => {
    it('validates valid tags', () => {
      const validTags = ['test', 'test-tag', 'test_tag', 'test123']
      
      validTags.forEach(tag => {
        const result = tagSchema.parse(tag)
        expect(result).toBe(tag)
      })
    })

    it('rejects invalid tags', () => {
      const invalidTags = ['', 'test tag', 'test@tag', 'test!tag']
      
      invalidTags.forEach(tag => {
        expect(() => tagSchema.parse(tag)).toThrow()
      })
    })

    it('enforces length limits', () => {
      const tooLong = 'a'.repeat(31)
      expect(() => tagSchema.parse(tooLong)).toThrow()
    })
  })

  describe('searchQuerySchema', () => {
    it('trims search queries', () => {
      const result = searchQuerySchema.parse('  test query  ')
      expect(result).toBe('test query')
    })

    it('enforces length limit', () => {
      const tooLong = 'a'.repeat(101)
      expect(() => searchQuerySchema.parse(tooLong)).toThrow()
    })
  })

  describe('validateFormData', () => {
    it('returns success with valid data', () => {
      const result = validateFormData(entryFormSchema, {
        content: 'Valid content',
        priority: 3,
      })
      
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.content).toBe('Valid content')
      }
    })

    it('returns errors with invalid data', () => {
      const result = validateFormData(entryFormSchema, {
        content: '',
      })
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors.content).toBeDefined()
      }
    })

    it('returns errors for invalid data structure', () => {
      // Pass null which will trigger validation errors
      const result = validateFormData(entryFormSchema, null)
      
      expect(result.success).toBe(false)
      if (!result.success) {
        expect(result.errors).toBeDefined()
        // When passing null, Zod will produce validation errors
        // or a generic form error
        const hasErrors = Object.keys(result.errors).length > 0 || result.errors._form
        expect(hasErrors).toBeTruthy()
      }
    })
  })
})