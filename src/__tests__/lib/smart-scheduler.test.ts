import { describe, it, expect, vi, beforeEach } from 'vitest'
import { SmartScheduler } from '@/lib/smart-scheduler'
import { AIProcessor } from '@/lib/ai-processor'

// Mock AIProcessor
vi.mock('@/lib/ai-processor', () => ({
  AIProcessor: vi.fn().mockImplementation(() => ({
    analyzeContent: vi.fn(),
    generateSchedulingSuggestions: vi.fn(),
  })),
}))

// Mock Supabase
vi.mock('@/lib/supabase', () => ({
  createSupabaseClient: () => ({
    auth: {
      getSession: vi.fn().mockResolvedValue({
        data: { session: { user: { id: 'test-user' } } },
        error: null,
      }),
    },
    functions: {
      invoke: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  }),
}))

describe('SmartScheduler', () => {
  let scheduler: SmartScheduler
  let mockAIProcessor: AIProcessor

  beforeEach(() => {
    mockAIProcessor = new AIProcessor('test-key')
    scheduler = new SmartScheduler(mockAIProcessor)
  })

  describe('generateDefaultUserPattern', () => {
    it('should return default user pattern with preferred times', () => {
      const pattern = SmartScheduler.generateDefaultUserPattern()

      expect(pattern.preferredTimes).toBeDefined()
      expect(pattern.preferredTimes.length).toBeGreaterThan(0)
      expect(pattern.preferredTimes[0]).toHaveProperty('hour')
      expect(pattern.preferredTimes[0]).toHaveProperty('score')
    })

    it('should have peak productivity at 10am', () => {
      const pattern = SmartScheduler.generateDefaultUserPattern()

      const tenAm = pattern.preferredTimes.find((t) => t.hour === 10)
      expect(tenAm?.score).toBe(0.95)
    })

    it('should have category preferences', () => {
      const pattern = SmartScheduler.generateDefaultUserPattern()

      expect(pattern.categoryPreferences).toHaveProperty('Learning')
      expect(pattern.categoryPreferences).toHaveProperty('Build')
      expect(pattern.categoryPreferences).toHaveProperty('Creative')
      expect(pattern.categoryPreferences['Learning'].timeOfDay).toBe('morning')
      expect(pattern.categoryPreferences['Creative'].timeOfDay).toBe('afternoon')
    })

    it('should have completion rates for hours', () => {
      const pattern = SmartScheduler.generateDefaultUserPattern()

      expect(pattern.completionRates).toBeDefined()
      expect(pattern.completionRates['10']).toBe(0.95)
    })

    it('should have average session duration', () => {
      const pattern = SmartScheduler.generateDefaultUserPattern()

      expect(pattern.averageSessionDuration).toBe(30)
    })
  })

  describe('findOptimalTimeSlots', () => {
    it('should find slots that fit the entry duration', async () => {
      const entry = {
        content: 'Test entry',
        category: 'Learning',
        urgency: 'high',
        estimatedDuration: 30,
      }
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const availableSlots = [
        {
          start: new Date('2024-01-15T09:00:00'),
          end: new Date('2024-01-15T10:00:00'),
        },
        {
          start: new Date('2024-01-15T10:00:00'),
          end: new Date('2024-01-15T11:00:00'),
        },
      ]
      const existingEvents: Array<{ start: Date; end: Date }> = []

      const slots = await scheduler.findOptimalTimeSlots(
        entry,
        userPattern,
        availableSlots,
        existingEvents
      )

      expect(slots.length).toBeGreaterThan(0)
      slots.forEach((slot) => {
        expect(slot).toHaveProperty('start')
        expect(slot).toHaveProperty('end')
        expect(slot).toHaveProperty('score')
        expect(slot).toHaveProperty('reason')
      })
    })

    it('should filter out slots that are too short', async () => {
      const entry = {
        content: 'Test entry',
        category: 'Learning',
        urgency: 'medium',
        estimatedDuration: 90, // 90 minutes
      }
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const availableSlots = [
        {
          start: new Date('2024-01-15T09:00:00'),
          end: new Date('2024-01-15T10:00:00'), // Only 60 minutes
        },
      ]
      const existingEvents: Array<{ start: Date; end: Date }> = []

      const slots = await scheduler.findOptimalTimeSlots(
        entry,
        userPattern,
        availableSlots,
        existingEvents
      )

      expect(slots.length).toBe(0)
    })

    it('should avoid conflicting events', async () => {
      const entry = {
        content: 'Test entry',
        category: 'Learning',
        urgency: 'medium',
        estimatedDuration: 30,
      }
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const availableSlots = [
        {
          start: new Date('2024-01-15T09:00:00'),
          end: new Date('2024-01-15T10:00:00'),
        },
      ]
      const existingEvents = [
        {
          start: new Date('2024-01-15T09:15:00'),
          end: new Date('2024-01-15T09:45:00'),
        },
      ]

      const slots = await scheduler.findOptimalTimeSlots(
        entry,
        userPattern,
        availableSlots,
        existingEvents
      )

      expect(slots.length).toBe(0)
    })

    it('should score high urgency entries higher', async () => {
      const highUrgencyEntry = {
        content: 'High urgency',
        category: 'Learning',
        urgency: 'high',
        estimatedDuration: 30,
      }
      const lowUrgencyEntry = {
        content: 'Low urgency',
        category: 'Learning',
        urgency: 'low',
        estimatedDuration: 30,
      }
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const availableSlots = [
        {
          start: new Date('2024-01-15T10:00:00'),
          end: new Date('2024-01-15T11:00:00'),
        },
      ]
      const existingEvents: Array<{ start: Date; end: Date }> = []

      const highSlots = await scheduler.findOptimalTimeSlots(
        highUrgencyEntry,
        userPattern,
        availableSlots,
        existingEvents
      )
      const lowSlots = await scheduler.findOptimalTimeSlots(
        lowUrgencyEntry,
        userPattern,
        availableSlots,
        existingEvents
      )

      expect(highSlots[0].score).toBeGreaterThan(lowSlots[0].score)
    })

    it('should return at most 5 slots', async () => {
      const entry = {
        content: 'Test entry',
        category: 'Learning',
        urgency: 'medium',
        estimatedDuration: 30,
      }
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const availableSlots = Array.from({ length: 10 }, (_, i) => ({
        start: new Date(`2024-01-15T${9 + i}:00:00`),
        end: new Date(`2024-01-15T${10 + i}:00:00`),
      }))
      const existingEvents: Array<{ start: Date; end: Date }> = []

      const slots = await scheduler.findOptimalTimeSlots(
        entry,
        userPattern,
        availableSlots,
        existingEvents
      )

      expect(slots.length).toBeLessThanOrEqual(5)
    })

    it('should sort slots by score descending', async () => {
      const entry = {
        content: 'Test entry',
        category: 'Learning',
        urgency: 'medium',
        estimatedDuration: 30,
      }
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const availableSlots = [
        {
          start: new Date('2024-01-15T10:00:00'),
          end: new Date('2024-01-15T11:00:00'),
        },
        {
          start: new Date('2024-01-15T09:00:00'),
          end: new Date('2024-01-15T10:00:00'),
        },
        {
          start: new Date('2024-01-15T14:00:00'),
          end: new Date('2024-01-15T15:00:00'),
        },
      ]
      const existingEvents: Array<{ start: Date; end: Date }> = []

      const slots = await scheduler.findOptimalTimeSlots(
        entry,
        userPattern,
        availableSlots,
        existingEvents
      )

      for (let i = 0; i < slots.length - 1; i++) {
        expect(slots[i].score).toBeGreaterThanOrEqual(slots[i + 1].score)
      }
    })
  })

  describe('generateWeeklySchedule', () => {
    it('should generate schedule for multiple entries', async () => {
      const entries = [
        {
          id: '1',
          content: 'Entry 1',
          category: 'Learning',
          urgency: 'high',
          estimatedDuration: 30,
        },
        {
          id: '2',
          content: 'Entry 2',
          category: 'Build',
          urgency: 'medium',
          estimatedDuration: 45,
        },
      ]
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const weekStart = new Date('2024-01-15') // Monday

      const schedule = await scheduler.generateWeeklySchedule(
        entries,
        userPattern,
        weekStart
      )

      expect(schedule.length).toBeGreaterThan(0)
      schedule.forEach((suggestion) => {
        expect(suggestion).toHaveProperty('entryId')
        expect(suggestion).toHaveProperty('suggestedTime')
        expect(suggestion).toHaveProperty('confidence')
        expect(suggestion).toHaveProperty('reason')
        expect(suggestion).toHaveProperty('duration')
      })
    })

    it('should prioritize high urgency entries', async () => {
      const entries = [
        {
          id: '1',
          content: 'Low urgency',
          category: 'Learning',
          urgency: 'low',
          estimatedDuration: 30,
        },
        {
          id: '2',
          content: 'High urgency',
          category: 'Build',
          urgency: 'high',
          estimatedDuration: 30,
        },
      ]
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const weekStart = new Date('2024-01-15')

      const schedule = await scheduler.generateWeeklySchedule(
        entries,
        userPattern,
        weekStart
      )

      // High urgency entry should get better time slot
      const highUrgencySchedule = schedule.find((s) => s.entryId === '2')
      const lowUrgencySchedule = schedule.find((s) => s.entryId === '1')

      if (highUrgencySchedule && lowUrgencySchedule) {
        expect(highUrgencySchedule.confidence).toBeGreaterThanOrEqual(
          lowUrgencySchedule.confidence
        )
      }
    })

    it('should not schedule overlapping entries', async () => {
      const entries = [
        {
          id: '1',
          content: 'Entry 1',
          category: 'Learning',
          urgency: 'high',
          estimatedDuration: 60,
        },
        {
          id: '2',
          content: 'Entry 2',
          category: 'Build',
          urgency: 'high',
          estimatedDuration: 60,
        },
      ]
      const userPattern = SmartScheduler.generateDefaultUserPattern()
      const weekStart = new Date('2024-01-15')

      const schedule = await scheduler.generateWeeklySchedule(
        entries,
        userPattern,
        weekStart
      )

      // Check no overlaps
      for (let i = 0; i < schedule.length; i++) {
        for (let j = i + 1; j < schedule.length; j++) {
          const slot1Start = schedule[i].suggestedTime.getTime()
          const slot1End = slot1Start + schedule[i].duration * 60000
          const slot2Start = schedule[j].suggestedTime.getTime()
          const slot2End = slot2Start + schedule[j].duration * 60000

          const overlaps = slot1Start < slot2End && slot2Start < slot1End
          expect(overlaps).toBe(false)
        }
      }
    })
  })
})
