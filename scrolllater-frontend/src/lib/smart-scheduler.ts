// src/lib/smart-scheduler.ts
import { createSupabaseClient } from './supabase';
import { AIProcessor } from './ai-processor'

/**
 * Triggers the AI-powered scheduling suggestion process for an entry.
 * This function invokes the 'ai-schedule-suggest' Supabase Edge Function.
 * @param entryId - The ID of the entry for which to generate suggestions.
 */
export const getScheduleSuggestions = async (entryId: string) => {
  const supabase = createSupabaseClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error('User is not authenticated.');
  }

  const { data, error } = await supabase.functions.invoke('ai-schedule-suggest', {
    body: { entryId },
  });

  if (error) {
    console.error('Error invoking ai-schedule-suggest function:', error);
    throw error;
  }

  return data;
};

interface TimeSlot {
  start: Date
  end: Date
  score: number
  reason: string
}

interface UserPattern {
  preferredTimes: Array<{ hour: number; score: number }>
  categoryPreferences: Record<string, { timeOfDay: string; score: number }>
  completionRates: Record<string, number>
  averageSessionDuration: number
}

interface SchedulingSuggestion {
  entryId: string
  suggestedTime: Date
  confidence: number
  reason: string
  duration: number
}

export class SmartScheduler {
  private aiProcessor: AIProcessor

  constructor(aiProcessor: AIProcessor) {
    this.aiProcessor = aiProcessor
  }

  async findOptimalTimeSlots(
    entry: {
      content: string
      category: string
      urgency: string
      estimatedDuration: number
    },
    userPattern: UserPattern,
    availableSlots: Array<{ start: Date; end: Date }>,
    existingEvents: Array<{ start: Date; end: Date }>
  ): Promise<TimeSlot[]> {
    const candidates: TimeSlot[] = []

    for (const slot of availableSlots) {
      // Check if slot is long enough
      const slotDuration = (slot.end.getTime() - slot.start.getTime()) / (1000 * 60)
      if (slotDuration < entry.estimatedDuration) continue

      // Check for conflicts with existing events
      const hasConflict = existingEvents.some(event => 
        this.timeRangesOverlap(slot, event)
      )
      if (hasConflict) continue

      // Calculate score based on multiple factors
      const score = this.calculateSlotScore(slot, entry, userPattern)
      
      candidates.push({
        start: slot.start,
        end: new Date(slot.start.getTime() + entry.estimatedDuration * 60000),
        score,
        reason: this.generateScoreReason(slot, entry, userPattern, score)
      })
    }

    // Sort by score (highest first) and return top candidates
    return candidates
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
  }

  private calculateSlotScore(
    slot: { start: Date; end: Date },
    entry: { category: string; urgency: string },
    userPattern: UserPattern
  ): number {
    let score = 0

    // Time of day preference
    const hour = slot.start.getHours()
    const timePreference = userPattern.preferredTimes.find(p => p.hour === hour)
    if (timePreference) {
      score += timePreference.score * 0.3
    }

    // Category-specific time preferences
    const categoryPref = userPattern.categoryPreferences[entry.category]
    if (categoryPref) {
      const timeOfDay = this.getTimeOfDay(hour)
      if (timeOfDay === categoryPref.timeOfDay) {
        score += categoryPref.score * 0.25
      }
    }

    // Urgency factor
    const urgencyMultiplier: Record<string, number> = {
      'high': 1.5,
      'medium': 1.0,
      'low': 0.7
    }
    score *= urgencyMultiplier[entry.urgency] || 1.0

    // Completion rate for this time slot
    const completionRate = userPattern.completionRates[hour.toString()] || 0.5
    score += completionRate * 0.2

    // Avoid scheduling too early or too late
    if (hour < 7 || hour > 22) {
      score *= 0.5
    }

    // Prefer weekday mornings for productive tasks
    const dayOfWeek = slot.start.getDay()
    if (dayOfWeek >= 1 && dayOfWeek <= 5 && hour >= 9 && hour <= 11) {
      if (['Build', 'Learning', 'Business'].includes(entry.category)) {
        score *= 1.2
      }
    }

    return Math.max(0, Math.min(100, score))
  }

  private getTimeOfDay(hour: number): string {
    if (hour >= 6 && hour < 12) return 'morning'
    if (hour >= 12 && hour < 18) return 'afternoon'
    return 'evening'
  }

  private timeRangesOverlap(
    range1: { start: Date; end: Date },
    range2: { start: Date; end: Date }
  ): boolean {
    return range1.start < range2.end && range2.start < range1.end
  }

  private generateScoreReason(
    slot: { start: Date; end: Date },
    entry: { category: string; urgency: string },
    userPattern: UserPattern,
    score: number
  ): string {
    const hour = slot.start.getHours()
    const timeOfDay = this.getTimeOfDay(hour)
    
    const reasons = []

    if (score > 80) {
      reasons.push('Optimal time based on your patterns')
    } else if (score > 60) {
      reasons.push('Good time for this type of content')
    } else {
      reasons.push('Available slot')
    }

    const categoryPref = userPattern.categoryPreferences[entry.category]
    if (categoryPref && timeOfDay === categoryPref.timeOfDay) {
      reasons.push(`${timeOfDay} is ideal for ${entry.category.toLowerCase()} tasks`)
    }

    if (entry.urgency === 'high') {
      reasons.push('Prioritized due to high urgency')
    }

    return reasons.join('. ')
  }

  async generateWeeklySchedule(
    entries: Array<{
      id: string
      content: string
      category: string
      urgency: string
      estimatedDuration: number
    }>,
    userPattern: UserPattern,
    weekStart: Date
  ): Promise<SchedulingSuggestion[]> {
    const schedule: SchedulingSuggestion[] = []
    const weekEnd = new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)
    
    // Generate available slots for the week
    const availableSlots = this.generateWeeklySlots(weekStart, weekEnd, userPattern)
    const scheduledSlots: Array<{ start: Date; end: Date }> = []

    // Sort entries by priority (urgency + AI confidence)
    const sortedEntries = entries.sort((a, b) => {
      const urgencyScore: Record<string, number> = { 'high': 3, 'medium': 2, 'low': 1 }
      return (urgencyScore[b.urgency] || 1) - (urgencyScore[a.urgency] || 1)
    })

    for (const entry of sortedEntries) {
      const timeSlots = await this.findOptimalTimeSlots(
        entry,
        userPattern,
        availableSlots,
        scheduledSlots
      )

      if (timeSlots.length > 0) {
        const bestSlot = timeSlots[0]
        schedule.push({
          entryId: entry.id,
          suggestedTime: bestSlot.start,
          confidence: bestSlot.score / 100,
          reason: bestSlot.reason,
          duration: entry.estimatedDuration
        })

        // Mark this slot as used
        scheduledSlots.push({
          start: bestSlot.start,
          end: bestSlot.end
        })

        // Remove overlapping available slots
        this.removeOverlappingSlots(availableSlots, bestSlot)
      }
    }

    return schedule
  }

  private generateWeeklySlots(
    weekStart: Date,
    weekEnd: Date,
    userPattern: UserPattern
  ): Array<{ start: Date; end: Date }> {
    const slots = []
    const current = new Date(weekStart)

    while (current < weekEnd) {
      // Skip weekends if user prefers weekdays
      const dayOfWeek = current.getDay()
      if (dayOfWeek === 0 || dayOfWeek === 6) {
        current.setDate(current.getDate() + 1)
        continue
      }

      // Generate slots for working hours
      for (let hour = 9; hour <= 17; hour++) {
        const slotStart = new Date(current)
        slotStart.setHours(hour, 0, 0, 0)
        
        const slotEnd = new Date(slotStart)
        slotEnd.setHours(hour + 1, 0, 0, 0)

        slots.push({ start: slotStart, end: slotEnd })
      }

      current.setDate(current.getDate() + 1)
    }

    return slots
  }

  private removeOverlappingSlots(
    availableSlots: Array<{ start: Date; end: Date }>,
    usedSlot: { start: Date; end: Date }
  ): void {
    for (let i = availableSlots.length - 1; i >= 0; i--) {
      if (this.timeRangesOverlap(availableSlots[i], usedSlot)) {
        availableSlots.splice(i, 1)
      }
    }
  }

  // Generate default user patterns based on common productivity research
  static generateDefaultUserPattern(): UserPattern {
    return {
      preferredTimes: [
        { hour: 9, score: 0.9 },   // Morning peak
        { hour: 10, score: 0.95 }, // Peak productivity
        { hour: 11, score: 0.85 }, // Late morning
        { hour: 14, score: 0.8 },  // Afternoon
        { hour: 15, score: 0.75 }, // Mid-afternoon
        { hour: 16, score: 0.7 }   // Late afternoon
      ],
      categoryPreferences: {
        'Learning': { timeOfDay: 'morning', score: 0.9 },
        'Build': { timeOfDay: 'morning', score: 0.85 },
        'Business': { timeOfDay: 'morning', score: 0.8 },
        'Creative': { timeOfDay: 'afternoon', score: 0.8 },
        'Read Later': { timeOfDay: 'evening', score: 0.7 },
        'Explore': { timeOfDay: 'afternoon', score: 0.75 }
      },
      completionRates: {
        '9': 0.9,
        '10': 0.95,
        '11': 0.85,
        '14': 0.8,
        '15': 0.75,
        '16': 0.7
      },
      averageSessionDuration: 30
    }
  }
}
