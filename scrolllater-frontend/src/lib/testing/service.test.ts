import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals'
import { EntriesService } from '@/lib/services/entries.service'
import { TestDatabaseHelper, MockAIProcessor, TestUtils } from './test-helpers'

describe('EntriesService', () => {
  let entriesService: EntriesService
  let testDb: TestDatabaseHelper
  let testUser: { user: any; session: any }

  beforeAll(async () => {
    testDb = new TestDatabaseHelper()
    entriesService = new EntriesService()
  })

  beforeEach(async () => {
    testUser = await testDb.createTestUser()
  })

  afterEach(async () => {
    await testDb.cleanup()
  })

  describe('createEntry', () => {
    it('should create a new entry successfully', async () => {
      const entryData = {
        content: 'Test content for new entry',
        originalInput: 'Test input',
        source: 'test'
      }

      const result = await entriesService.createEntry(
        testUser.user.id,
        entryData,
        false // Disable AI processing for test
      )

      expect(result.success).toBe(true)
      expect(result.data).toMatchObject({
        content: entryData.content,
        original_input: entryData.originalInput,
        user_id: testUser.user.id,
        status: 'inbox'
      })
    })

    it('should fail with missing required fields', async () => {
      const invalidData = {
        content: 'Test content'
        // Missing originalInput
      }

      await TestUtils.assertThrows(
        () => entriesService.createEntry(testUser.user.id, invalidData as any),
        'Missing required fields'
      )
    })

    it('should fail with content too large', async () => {
      const largeContent = 'a'.repeat(60000) // Exceeds 50KB limit
      const entryData = {
        content: largeContent,
        originalInput: 'Test input'
      }

      await TestUtils.assertThrows(
        () => entriesService.createEntry(testUser.user.id, entryData),
        'Content too large'
      )
    })
  })

  describe('getEntry', () => {
    it('should retrieve an entry by ID', async () => {
      // Create test entry
      const entries = await testDb.createTestEntries(testUser.user.id, 1)
      const entryId = entries[0].id

      const result = await entriesService.getEntry(entryId, testUser.user.id)

      expect(result.success).toBe(true)
      expect(result.data?.id).toBe(entryId)
      expect(result.data?.user_id).toBe(testUser.user.id)
    })

    it('should fail for non-existent entry', async () => {
      const fakeId = TestUtils.generateTestId()

      const result = await entriesService.getEntry(fakeId, testUser.user.id)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NOT_FOUND')
    })

    it('should fail for entry belonging to different user', async () => {
      // Create another user and entry
      const anotherUser = await testDb.createTestUser()
      const entries = await testDb.createTestEntries(anotherUser.user.id, 1)
      const entryId = entries[0].id

      const result = await entriesService.getEntry(entryId, testUser.user.id)

      expect(result.success).toBe(false)
      expect(result.error?.code).toBe('NOT_FOUND')
    })
  })

  describe('updateEntry', () => {
    it('should update an entry successfully', async () => {
      const entries = await testDb.createTestEntries(testUser.user.id, 1)
      const entryId = entries[0].id

      const updateData = {
        title: 'Updated title',
        userNotes: 'Updated notes',
        priority: 5
      }

      const result = await entriesService.updateEntry(entryId, testUser.user.id, updateData)

      expect(result.success).toBe(true)
      expect(result.data?.title).toBe(updateData.title)
      expect(result.data?.user_notes).toBe(updateData.userNotes)
      expect(result.data?.priority).toBe(updateData.priority)
    })

    it('should validate priority range', async () => {
      const entries = await testDb.createTestEntries(testUser.user.id, 1)
      const entryId = entries[0].id

      const updateData = {
        priority: 10 // Invalid priority
      }

      await TestUtils.assertThrows(
        () => entriesService.updateEntry(entryId, testUser.user.id, updateData),
        'Priority must be between 1 and 5'
      )
    })
  })

  describe('bulkUpdateEntries', () => {
    it('should update multiple entries', async () => {
      const entries = await testDb.createTestEntries(testUser.user.id, 3)
      const entryIds = entries.map(e => e.id)

      const updateData = {
        status: 'archived',
        userNotes: 'Bulk updated'
      }

      const result = await entriesService.bulkUpdateEntries(
        testUser.user.id,
        entryIds,
        updateData
      )

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(3)
      expect(result.data?.successful).toBe(3)
      expect(result.data?.failed).toBe(0)
    })

    it('should handle partial failures', async () => {
      const entries = await testDb.createTestEntries(testUser.user.id, 2)
      const entryIds = [...entries.map(e => e.id), TestUtils.generateTestId()]

      const updateData = {
        status: 'completed'
      }

      const result = await entriesService.bulkUpdateEntries(
        testUser.user.id,
        entryIds,
        updateData
      )

      expect(result.success).toBe(true)
      expect(result.data?.processed).toBe(3)
      expect(result.data?.successful).toBe(2)
      expect(result.data?.failed).toBe(1)
      expect(result.data?.errors).toHaveLength(1)
    })
  })

  describe('getEntries with pagination', () => {
    beforeEach(async () => {
      // Create more test entries for pagination testing
      await testDb.createTestEntries(testUser.user.id, 25)
    })

    it('should return paginated results', async () => {
      const result = await entriesService.getEntries(testUser.user.id, {
        pagination: { page: 1, limit: 10 }
      })

      expect(result.success).toBe(true)
      expect(result.data?.data).toHaveLength(10)
      expect(result.data?.page).toBe(1)
      expect(result.data?.limit).toBe(10)
      expect(result.data?.total).toBe(25)
      expect(result.data?.totalPages).toBe(3)
      expect(result.data?.hasNext).toBe(true)
      expect(result.data?.hasPrev).toBe(false)
    })

    it('should filter by status', async () => {
      const result = await entriesService.getEntries(testUser.user.id, {
        filters: { status: 'inbox' }
      })

      expect(result.success).toBe(true)
      result.data?.data.forEach(entry => {
        expect(entry.status).toBe('inbox')
      })
    })

    it('should filter by category', async () => {
      const result = await entriesService.getEntries(testUser.user.id, {
        filters: { category: 'Read Later' }
      })

      expect(result.success).toBe(true)
      result.data?.data.forEach(entry => {
        expect(['Read Later']).toContain(entry.ai_category || entry.user_category)
      })
    })
  })

  describe('searchEntries', () => {
    beforeEach(async () => {
      // Create entries with specific content for search testing
      const searchEntries = [
        { content: 'JavaScript tutorial for beginners', originalInput: 'JS tutorial' },
        { content: 'Python data science guide', originalInput: 'Python guide' },
        { content: 'React component patterns', originalInput: 'React patterns' }
      ]

      for (const entryData of searchEntries) {
        await entriesService.createEntry(testUser.user.id, entryData, false)
      }
    })

    it('should search entries by content', async () => {
      const result = await entriesService.searchEntries(
        testUser.user.id,
        'JavaScript'
      )

      expect(result.success).toBe(true)
      expect(result.data?.data.length).toBeGreaterThan(0)
      
      const hasJavaScript = result.data?.data.some(entry => 
        entry.content.includes('JavaScript')
      )
      expect(hasJavaScript).toBe(true)
    })

    it('should return empty results for non-matching search', async () => {
      const result = await entriesService.searchEntries(
        testUser.user.id,
        'NonExistentTerm'
      )

      expect(result.success).toBe(true)
      expect(result.data?.data).toHaveLength(0)
    })
  })

  describe('getEntryStats', () => {
    beforeEach(async () => {
      await testDb.createTestEntries(testUser.user.id, 10)
    })

    it('should return user statistics', async () => {
      const result = await entriesService.getEntryStats(testUser.user.id)

      expect(result.success).toBe(true)
      expect(result.data?.total).toBe(10)
      expect(result.data?.byStatus).toMatchObject(
        expect.objectContaining({
          inbox: expect.any(Number),
          scheduled: expect.any(Number)
        })
      )
      expect(result.data?.byCategory).toBeDefined()
      expect(result.data?.avgReadTime).toBeGreaterThan(0)
    })
  })

  describe('scheduleEntry', () => {
    it('should schedule an entry', async () => {
      const entries = await testDb.createTestEntries(testUser.user.id, 1)
      const entryId = entries[0].id
      const scheduledFor = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()

      const result = await entriesService.scheduleEntry(
        entryId,
        testUser.user.id,
        scheduledFor
      )

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('scheduled')
      expect(result.data?.scheduled_for).toBe(scheduledFor)
    })

    it('should fail with invalid date', async () => {
      const entries = await testDb.createTestEntries(testUser.user.id, 1)
      const entryId = entries[0].id

      await TestUtils.assertThrows(
        () => entriesService.scheduleEntry(entryId, testUser.user.id, 'invalid-date'),
        'Invalid scheduled date'
      )
    })
  })

  describe('completeEntry', () => {
    it('should mark entry as completed', async () => {
      const entries = await testDb.createTestEntries(testUser.user.id, 1)
      const entryId = entries[0].id

      const result = await entriesService.completeEntry(entryId, testUser.user.id)

      expect(result.success).toBe(true)
      expect(result.data?.status).toBe('completed')
      expect(result.data?.completed_at).toBeDefined()
    })
  })
})

describe('Performance Tests', () => {
  let entriesService: EntriesService
  let testDb: TestDatabaseHelper
  let testUser: { user: any; session: any }

  beforeAll(async () => {
    testDb = new TestDatabaseHelper()
    entriesService = new EntriesService()
    testUser = await testDb.createTestUser()
    
    // Create a large number of entries for performance testing
    await testDb.createTestEntries(testUser.user.id, 1000)
  })

  afterAll(async () => {
    await testDb.cleanup()
  })

  it('should retrieve entries efficiently', async () => {
    const timer = TestUtils.createTimer()
    
    timer.start()
    const result = await entriesService.getEntries(testUser.user.id, {
      pagination: { page: 1, limit: 50 }
    })
    const executionTime = timer.stop()

    expect(result.success).toBe(true)
    expect(executionTime).toBeLessThan(1000) // Should complete within 1 second
  })

  it('should search entries efficiently', async () => {
    const timer = TestUtils.createTimer()
    
    timer.start()
    const result = await entriesService.searchEntries(
      testUser.user.id,
      'test'
    )
    const executionTime = timer.stop()

    expect(result.success).toBe(true)
    expect(executionTime).toBeLessThan(2000) // Search should complete within 2 seconds
  })
})