import { describe, it, expect } from 'vitest'
import {
  demoItems,
  collections,
  digestCategories,
  scheduleDays,
  categoryThumbBg,
  categoryThumbIcon,
  categoryBadge,
  type DemoItem,
  type Collection,
  type DigestCategory,
} from '@/lib/demo-data'

describe('demo-data', () => {
  describe('demoItems', () => {
    it('should have items with required properties', () => {
      expect(demoItems.length).toBeGreaterThan(0)

      demoItems.forEach((item: DemoItem) => {
        expect(item).toHaveProperty('id')
        expect(item).toHaveProperty('type')
        expect(item).toHaveProperty('title')
        expect(item).toHaveProperty('source')
        expect(item).toHaveProperty('excerpt')
        expect(item).toHaveProperty('savedAgo')
        expect(item).toHaveProperty('readTimeMinutes')
        expect(item).toHaveProperty('category')
        expect(item).toHaveProperty('tags')
        expect(item).toHaveProperty('isRead')
      })
    })

    it('should have valid content types', () => {
      const validTypes = ['article', 'video', 'tweet', 'reddit']
      demoItems.forEach((item: DemoItem) => {
        expect(validTypes).toContain(item.type)
      })
    })

    it('should have positive read times', () => {
      demoItems.forEach((item: DemoItem) => {
        expect(item.readTimeMinutes).toBeGreaterThan(0)
      })
    })

    it('should have tags as arrays', () => {
      demoItems.forEach((item: DemoItem) => {
        expect(Array.isArray(item.tags)).toBe(true)
        expect(item.tags.length).toBeGreaterThan(0)
      })
    })

    it('should have unique IDs', () => {
      const ids = demoItems.map((item: DemoItem) => item.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })
  })

  describe('collections', () => {
    it('should have collections with required properties', () => {
      expect(collections.length).toBeGreaterThan(0)

      collections.forEach((collection: Collection) => {
        expect(collection).toHaveProperty('id')
        expect(collection).toHaveProperty('name')
        expect(collection).toHaveProperty('color')
        expect(collection).toHaveProperty('dotColor')
        expect(collection).toHaveProperty('hex')
        expect(collection.hex).toMatch(/^#[0-9A-Fa-f]{6}$/)
      })
    })

    it('should have unique IDs', () => {
      const ids = collections.map((c: Collection) => c.id)
      const uniqueIds = new Set(ids)
      expect(uniqueIds.size).toBe(ids.length)
    })

    it('should have Tailwind color classes', () => {
      collections.forEach((collection: Collection) => {
        expect(collection.color).toMatch(/^text-\w+-\d+ bg-\w+-\d+$/)
        expect(collection.dotColor).toMatch(/^bg-\w+-\d+$/)
      })
    })
  })

  describe('digestCategories', () => {
    it('should have categories with required properties', () => {
      expect(digestCategories.length).toBeGreaterThan(0)

      digestCategories.forEach((category: DigestCategory) => {
        expect(category).toHaveProperty('category')
        expect(category).toHaveProperty('label')
        expect(category).toHaveProperty('itemCount')
        expect(category).toHaveProperty('totalMinutes')
        expect(category).toHaveProperty('keyTheme')
        expect(category).toHaveProperty('keyTakeaway')
      })
    })

    it('should have positive item counts and minutes', () => {
      digestCategories.forEach((category: DigestCategory) => {
        expect(category.itemCount).toBeGreaterThan(0)
        expect(category.totalMinutes).toBeGreaterThan(0)
      })
    })
  })

  describe('scheduleDays', () => {
    it('should have days with required properties', () => {
      expect(scheduleDays.length).toBeGreaterThan(0)

      scheduleDays.forEach((day) => {
        expect(day).toHaveProperty('date')
        expect(day).toHaveProperty('label')
        expect(day).toHaveProperty('dayName')
      })
    })

    it('should have valid date format', () => {
      scheduleDays.forEach((day) => {
        expect(day.date).toMatch(/^\d{4}-\d{2}-\d{2}$/)
      })
    })
  })

  describe('category styling maps', () => {
    it('categoryThumbBg should have entries for all collections', () => {
      collections.forEach((collection: Collection) => {
        expect(categoryThumbBg).toHaveProperty(collection.id)
        expect(categoryThumbBg[collection.id]).toMatch(/^bg-\w+-\d+$/)
      })
    })

    it('categoryThumbIcon should have entries for all collections', () => {
      collections.forEach((collection: Collection) => {
        expect(categoryThumbIcon).toHaveProperty(collection.id)
        expect(categoryThumbIcon[collection.id]).toMatch(/^text-\w+-\d+$/)
      })
    })

    it('categoryBadge should have entries for all collections', () => {
      collections.forEach((collection: Collection) => {
        expect(categoryBadge).toHaveProperty(collection.id)
        expect(categoryBadge[collection.id]).toMatch(/^bg-\w+-\d+ text-\w+-\d+$/)
      })
    })
  })
})
