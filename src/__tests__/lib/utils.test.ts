import { describe, it, expect } from 'vitest'
import { cn } from '@/lib/utils'

describe('cn utility function', () => {
  it('merges class names correctly', () => {
    const result = cn('px-4', 'py-2')
    expect(result).toBe('px-4 py-2')
  })

  it('handles conditional classes', () => {
    const isActive = true
    const result = cn('base-class', isActive && 'active-class')
    expect(result).toBe('base-class active-class')
  })

  it('filters out falsy values', () => {
    const result = cn('base-class', false, undefined, null, 'another-class')
    expect(result).toBe('base-class another-class')
  })

  it('merges Tailwind classes correctly (last wins)', () => {
    const result = cn('px-4', 'px-8')
    expect(result).toBe('px-8')
  })

  it('handles conflicting Tailwind utilities', () => {
    const result = cn('text-red-500', 'text-blue-500')
    expect(result).toBe('text-blue-500')
  })

  it('preserves non-conflicting utilities', () => {
    const result = cn('text-red-500', 'bg-blue-500', 'p-4')
    expect(result).toBe('text-red-500 bg-blue-500 p-4')
  })

  it('handles empty input', () => {
    const result = cn()
    expect(result).toBe('')
  })

  it('handles arrays of classes', () => {
    const result = cn(['px-4', 'py-2'], 'bg-white')
    expect(result).toBe('px-4 py-2 bg-white')
  })

  it('handles object syntax', () => {
    const result = cn({
      'px-4': true,
      'py-2': true,
      'bg-red-500': false,
    })
    expect(result).toBe('px-4 py-2')
  })
})
