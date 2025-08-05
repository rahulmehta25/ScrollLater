'use client'

import { useState, useEffect, useCallback } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { CalendarIcon, ClockIcon, SparklesIcon, CheckIcon } from '@heroicons/react/24/outline'
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval } from 'date-fns'
import { Tooltip } from '@/components/ui/Tooltip'

interface SchedulingSuggestion {
  entryId: string
  suggestedTime: Date
  confidence: number
  reason: string
  duration: number
}

interface TimeSlot {
  start: Date
  end: Date
  available: boolean
  scheduled: boolean
}

export function SmartScheduler() {
  const [suggestions, setSuggestions] = useState<SchedulingSuggestion[]>([])
  const [timeSlots, setTimeSlots] = useState<TimeSlot[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedDate, setSelectedDate] = useState(new Date())
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  const generateSuggestions = useCallback(async () => {
    setLoading(true)
    try {
      // Get unscheduled entries
      const { data: entries, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', user?.id)
        .eq('status', 'inbox')
        .order('created_at', { ascending: false })
        .limit(10)

      if (error) throw error

      if (entries && entries.length > 0) {
        // Call AI scheduling suggestion API
        const response = await fetch('/api/ai/schedule-suggest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
          },
          body: JSON.stringify({
            entries: entries.map(entry => ({
              id: entry.id,
              content: entry.content,
              category: entry.ai_category || entry.user_category,
              urgency: entry.ai_confidence_score > 0.8 ? 'high' : 'medium'
            })),
            weekStart: startOfWeek(selectedDate),
            weekEnd: endOfWeek(selectedDate)
          })
        })

        if (response.ok) {
          const data = await response.json()
          setSuggestions(data.suggestions || [])
        }
      }
    } catch (error) {
      console.error('Error generating suggestions:', error)
    } finally {
      setLoading(false)
    }
  }, [user, selectedDate, supabase])

  const generateTimeSlots = useCallback(() => {
    const weekStart = startOfWeek(selectedDate)
    const weekEnd = endOfWeek(selectedDate)
    const days = eachDayOfInterval({ start: weekStart, end: weekEnd })
    
    const slots: TimeSlot[] = []
    
    days.forEach(day => {
      // Generate time slots for working hours (9 AM - 6 PM)
      for (let hour = 9; hour < 18; hour++) {
        const start = new Date(day)
        start.setHours(hour, 0, 0, 0)
        
        const end = new Date(start)
        end.setHours(hour + 1, 0, 0, 0)
        
        slots.push({
          start,
          end,
          available: true,
          scheduled: false
        })
      }
    })
    
    setTimeSlots(slots)
  }, [selectedDate])

  useEffect(() => {
    if (user) {
      generateSuggestions()
      generateTimeSlots()
    }
  }, [user, generateSuggestions, generateTimeSlots])

  const scheduleEntry = async (entryId: string, scheduledTime: Date, duration: number = 30) => {
    try {
      // Calculate end time for calendar event
      const endTime = new Date(scheduledTime.getTime() + duration * 60000)
      
      // Update entry status
      const { error: updateError } = await supabase
        .from('entries')
        .update({
          status: 'scheduled',
          scheduled_for: scheduledTime.toISOString()
        })
        .eq('id', entryId)
        .eq('user_id', user?.id)

      if (updateError) throw updateError

      // Create calendar event
      const response = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${(await supabase.auth.getSession()).data.session?.access_token}`
        },
        body: JSON.stringify({
          entryId,
          title: `Review: ${entryId}`,
          description: 'Scheduled content review',
          startTime: scheduledTime.toISOString(),
          endTime: endTime.toISOString(),
          duration
        })
      })

      if (response.ok) {
        // Refresh suggestions
        generateSuggestions()
        generateTimeSlots()
      }
    } catch (error) {
      console.error('Error scheduling entry:', error)
    }
  }

  const getDayName = (date: Date) => {
    return format(date, 'EEE')
  }

  const getTimeString = (date: Date) => {
    return format(date, 'h:mm a')
  }

  const getConfidenceColor = (confidence: number) => {
    if (confidence > 0.8) return 'text-green-600'
    if (confidence > 0.6) return 'text-yellow-600'
    return 'text-red-600'
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <SparklesIcon className="h-6 w-6 text-purple-600 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">
            Smart Scheduler
            <Tooltip content="AI-powered scheduling assistant that suggests optimal times for your entries based on content type and your preferences" position="right">
              <span className="ml-1 text-gray-400 cursor-help text-base">ⓘ</span>
            </Tooltip>
          </h2>
        </div>
        <button
          onClick={generateSuggestions}
          disabled={loading}
          className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
        >
          {loading ? 'Generating...' : 'Refresh Suggestions'}
        </button>
      </div>

      {/* AI Suggestions */}
      <div className="mb-8">
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          AI Scheduling Suggestions
          <Tooltip content="These suggestions are based on entry content, priority, and your past scheduling patterns" position="right">
            <span className="ml-1 text-gray-400 cursor-help text-sm">ⓘ</span>
          </Tooltip>
        </h3>
        {suggestions.length === 0 ? (
          <p className="text-gray-500 text-center py-8">
            {loading ? 'Analyzing your content...' : 'No suggestions available. Add more entries to get AI recommendations.'}
          </p>
        ) : (
          <div className="space-y-4">
            {suggestions.map((suggestion) => (
              <div
                key={suggestion.entryId}
                className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center mb-2">
                      <CalendarIcon className="h-4 w-4 text-gray-400 mr-2" />
                      <span className="text-sm font-medium text-gray-900">
                        {format(suggestion.suggestedTime, 'MMM d, yyyy')}
                      </span>
                      <ClockIcon className="h-4 w-4 text-gray-400 ml-4 mr-2" />
                      <span className="text-sm text-gray-600">
                        {getTimeString(suggestion.suggestedTime)} ({suggestion.duration} min)
                      </span>
                    </div>
                    <p className="text-sm text-gray-600 mb-2">{suggestion.reason}</p>
                    <div className="flex items-center">
                      <Tooltip content="Higher confidence means the AI is more certain this is a good time for this type of content">
                        <span className={`text-xs font-medium ${getConfidenceColor(suggestion.confidence)}`}>
                          {Math.round(suggestion.confidence * 100)}% confidence
                        </span>
                      </Tooltip>
                    </div>
                  </div>
                  <button
                    onClick={() => scheduleEntry(suggestion.entryId, suggestion.suggestedTime, suggestion.duration)}
                    className="ml-4 px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 flex items-center"
                  >
                    <CheckIcon className="h-4 w-4 mr-1" />
                    Schedule
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Weekly Calendar View */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-4">
          Weekly Schedule
          <Tooltip content="Visual overview of your available time slots and scheduled entries for this week" position="right">
            <span className="ml-1 text-gray-400 cursor-help text-sm">ⓘ</span>
          </Tooltip>
        </h3>
        <div className="grid grid-cols-7 gap-2">
          {/* Day headers */}
          {eachDayOfInterval({ start: startOfWeek(selectedDate), end: endOfWeek(selectedDate) }).map((day) => (
            <div key={day.toISOString()} className="text-center">
              <div className="text-xs font-medium text-gray-500 mb-1">
                {getDayName(day)}
              </div>
              <div className="text-sm font-semibold text-gray-900">
                {format(day, 'd')}
              </div>
            </div>
          ))}
          
          {/* Time slots */}
          {timeSlots.map((slot, index) => (
            <div
              key={index}
              className={`p-2 text-xs border rounded ${
                slot.scheduled
                  ? 'bg-red-100 border-red-300 text-red-800'
                  : slot.available
                  ? 'bg-green-50 border-green-200 text-green-800'
                  : 'bg-gray-50 border-gray-200 text-gray-500'
              }`}
            >
              {getTimeString(slot.start)}
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="mt-6 pt-6 border-t border-gray-200">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Quick Actions</h3>
        <div className="flex space-x-4">
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, -7))}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Previous Week
          </button>
          <button
            onClick={() => setSelectedDate(new Date())}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            This Week
          </button>
          <button
            onClick={() => setSelectedDate(addDays(selectedDate, 7))}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            Next Week
          </button>
        </div>
      </div>
    </div>
  )
} 