'use client'

import { useState } from 'react'
import { format, formatDistanceToNow, addDays, formatISO } from 'date-fns'
import { 
  CalendarIcon, 
  LinkIcon, 
  EllipsisVerticalIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrashIcon,
  SparklesIcon
} from '@heroicons/react/24/outline'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import type { Database } from '../../lib/supabase'
import { createSupabaseClient } from '@/lib/supabase'
import { AIAnalysisDisplay } from '@/components/ai/AIAnalysisDisplay'
import { AIAnalyzeButton } from '@/components/ai/AIAnalyzeButton'

type Entry = Database['public']['Tables']['entries']['Row']

interface EntryCardProps {
  item: Entry
  onUpdate: (itemId: string, updates: Partial<Entry>) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
}

const STATUS_COLORS = {
  inbox: 'bg-gray-100 text-gray-800',
  scheduled: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  archived: 'bg-yellow-100 text-yellow-800'
}

export function EntryCard({ item, onUpdate, onDelete }: EntryCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(() => formatISO(addDays(new Date(), 1), { representation: 'date' }))
  const [scheduleTime, setScheduleTime] = useState('14:00')
  const [scheduleDuration, setScheduleDuration] = useState(60)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  const [aiAnalysis, setAiAnalysis] = useState(() => {
    if (item.ai_summary || item.ai_category || item.ai_tags?.length) {
      return {
        summary: item.ai_summary || undefined,
        category: item.ai_category || undefined,
        tags: item.ai_tags || undefined,
        confidence: item.ai_confidence_score || undefined
      }
    }
    return null
  })

  const supabase = createSupabaseClient();

  const handleStatusChange = async (newStatus: Entry['status']) => {
    setIsLoading(true)
    try {
      await onUpdate(item.id, { status: newStatus })
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleSchedule = async (suggestedTime: string) => {
    setIsLoading(true)
    try {
      await onUpdate(item.id, { 
        status: 'scheduled', 
        scheduled_for: suggestedTime 
      })
    } catch (error) {
      console.error('Error scheduling entry:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleManualSchedule = async () => {
    setIsLoading(true)
    setScheduleError(null)
    setScheduleSuccess(null)
    try {
      // Combine date and time
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
      // Get the current access token from Supabase
      const { data: { session } } = await supabase.auth.getSession();
      const accessToken = session?.access_token;
      if (!accessToken) {
        setScheduleError('Authentication error. Please log in again.');
        setIsLoading(false);
        return;
      }
      // Call backend API to schedule event
      const res = await fetch('/api/calendar/schedule', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          entryId: item.id,
          title: item.title || item.content.substring(0, 60),
          description: item.ai_summary || item.content,
          startTime: scheduledDateTime.toISOString(),
          duration: scheduleDuration
        })
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.error === 'invalid_token') {
          setScheduleError('Google Calendar connection lost. Please reconnect in settings.')
        } else {
          setScheduleError(data.error || 'Failed to schedule event')
        }
        return
      }
      // Update entry with scheduled info
      await onUpdate(item.id, {
        status: 'scheduled',
        scheduled_for: scheduledDateTime.toISOString(),
        calendar_event_id: data.eventId,
        calendar_event_url: data.eventUrl
      })
      setScheduleSuccess('Event scheduled!')
      setShowScheduleModal(false)
    } catch (error: unknown) {
      setScheduleError(error instanceof Error ? error.message : 'Internal error')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this entry?')) {
      setIsLoading(true)
      try {
        await onDelete(item.id)
      } catch (error) {
        console.error('Error deleting entry:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }

  const category = item.user_category || item.ai_category;

  return (
    <article 
      className="bg-white dark:bg-secondary-900 rounded-xl shadow-soft border border-secondary-200 dark:border-secondary-800 p-4 sm:p-6 hover:shadow-medium transition-all duration-200 animate-fade-in"
      role="article"
      aria-label={`Entry: ${item.title || 'Untitled Entry'}`}
    >
      {/* Header */}
      <header className="flex items-start justify-between mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-base sm:text-lg font-semibold text-secondary-900 dark:text-secondary-100 mb-2 truncate">
            {item.title || 'Untitled Entry'}
          </h3>
          
          <div className="flex items-center flex-wrap gap-2 mb-2">
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[item.status]}`}>
              {item.status}
            </span>
            
            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800`}>
              Priority: {item.priority}
            </span>
            
            {category && (
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                {category}
              </span>
            )}
          </div>
        </div>

        {/* Actions Menu */}
        <Menu as="div" className="relative flex-shrink-0">
          <Menu.Button 
            className="p-2 text-secondary-400 hover:text-secondary-600 dark:text-secondary-500 dark:hover:text-secondary-300 rounded-lg hover:bg-secondary-100 dark:hover:bg-secondary-800 transition-colors"
            aria-label="Entry actions menu"
          >
            <EllipsisVerticalIcon className="h-5 w-5" />
          </Menu.Button>
          
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-large ring-1 ring-secondary-200 dark:ring-secondary-700 focus:outline-none z-20">
              <div className="py-1">
                {item.status !== 'completed' && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className={`${active ? 'bg-secondary-100 dark:bg-secondary-700' : ''} flex items-center w-full px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 transition-colors`}
                      >
                        <CheckIcon className="h-4 w-4 mr-2" />
                        Mark as Complete
                      </button>
                    )}
                  </Menu.Item>
                )}
                
                {item.status !== 'archived' && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleStatusChange('archived')}
                        className={`${active ? 'bg-secondary-100 dark:bg-secondary-700' : ''} flex items-center w-full px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 transition-colors`}
                      >
                        <ArchiveBoxIcon className="h-4 w-4 mr-2" />
                        Archive
                      </button>
                    )}
                  </Menu.Item>
                )}
                
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={handleDelete}
                      className={`${active ? 'bg-secondary-100 dark:bg-secondary-700' : ''} flex items-center w-full px-4 py-2 text-sm text-error-700 dark:text-error-400 transition-colors`}
                    >
                      <TrashIcon className="h-4 w-4 mr-2" />
                      Delete
                    </button>
                  )}
                </Menu.Item>
              </div>
            </Menu.Items>
          </Transition>
        </Menu>
      </header>

      {/* Content */}
      <div className="mb-4">
        <p className="text-secondary-700 dark:text-secondary-300 text-sm leading-relaxed break-words">
          {item.ai_summary || item.content}
        </p>
      </div>

      {/* AI Analysis Display */}
      {aiAnalysis && (
        <div className="mb-4">
          <AIAnalysisDisplay 
            analysis={aiAnalysis}
            onReanalyze={() => {
              // Handle re-analysis
              setAiAnalysis(null)
            }}
          />
        </div>
      )}

      {/* AI Analyze Button - show if no analysis exists */}
      {!aiAnalysis && item.content && (
        <div className="mb-4">
          <AIAnalyzeButton
            entryId={item.id}
            content={item.content}
            url={item.url || undefined}
            onAnalysisComplete={(analysis) => {
              const typedAnalysis = analysis as {
                summary?: string
                category?: string
                tags?: string[]
                confidence?: number
              }
              setAiAnalysis({
                summary: typedAnalysis.summary || undefined,
                category: typedAnalysis.category || undefined,
                tags: typedAnalysis.tags || [],
                confidence: typedAnalysis.confidence || undefined
              })
              // Update the item through parent callback
              onUpdate(item.id, {
                ai_summary: typedAnalysis.summary,
                ai_category: typedAnalysis.category,
                ai_tags: typedAnalysis.tags,
                ai_confidence_score: typedAnalysis.confidence
              })
            }}
            size="sm"
            variant="secondary"
          />
        </div>
      )}

      {/* URL */}
      {item.url && (
        <div className="mb-4">
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-800"
          >
            <LinkIcon className="h-4 w-4 mr-1" />
            Visit Link
          </a>
        </div>
      )}

      {/* Smart Schedule Suggestions */}
      {item.status === 'inbox' && item.ai_schedule_suggestions && Array.isArray(item.ai_schedule_suggestions) && item.ai_schedule_suggestions.length > 0 && (
        <div className="my-4 p-4 bg-purple-50 rounded-lg border border-purple-200">
            <h4 className="text-sm font-semibold text-purple-800 mb-3 flex items-center">
                <SparklesIcon className="h-5 w-5 mr-2 text-purple-500" />
                Smart Schedule Suggestions
            </h4>
            <div className="flex flex-col space-y-2">
                {(item.ai_schedule_suggestions as unknown as string[]).map((suggestion, index) => (
                    <button 
                        key={index}
                        onClick={() => handleSchedule(suggestion)}
                        disabled={isLoading}
                        className="text-left p-2 rounded-md bg-white hover:bg-purple-100 border border-purple-200 text-sm text-purple-700 disabled:opacity-50"
                    >
                        {format(new Date(suggestion), 'E, MMM d, h:mm a')}
                    </button>
                ))}
            </div>
        </div>
      )}
      {/* Manual Schedule Button */}
      {item.status === 'inbox' && (
        <div className="mt-4">
          <button
            onClick={() => setShowScheduleModal(true)}
            className="w-full py-2 px-4 rounded-md bg-blue-600 text-white font-medium hover:bg-blue-700 transition disabled:opacity-50"
            disabled={isLoading}
          >
            Schedule Manually
          </button>
        </div>
      )}
      {/* Scheduling Modal */}
      {showScheduleModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 z-50">
          <div className="bg-white rounded-lg shadow-lg max-w-md w-full mx-auto p-6 z-10">
            <h3 className="text-lg font-semibold mb-4">Schedule Entry</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Date</label>
                <input type="date" value={scheduleDate} onChange={e => setScheduleDate(e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Time</label>
                <input type="time" value={scheduleTime} onChange={e => setScheduleTime(e.target.value)} className="w-full border rounded px-2 py-1" />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
                <select value={scheduleDuration} onChange={e => setScheduleDuration(Number(e.target.value))} className="w-full border rounded px-2 py-1">
                  <option value={15}>15</option>
                  <option value={30}>30</option>
                  <option value={45}>45</option>
                  <option value={60}>60</option>
                  <option value={90}>90</option>
                  <option value={120}>120</option>
                </select>
              </div>
              {scheduleError && <div className="text-red-600 text-sm">{scheduleError}</div>}
              {scheduleSuccess && <div className="text-green-600 text-sm">{scheduleSuccess}</div>}
            </div>
            <div className="flex justify-end mt-6 space-x-2">
              <button onClick={() => setShowScheduleModal(false)} className="px-4 py-2 rounded bg-gray-200 text-gray-700">Cancel</button>
              <button onClick={handleManualSchedule} disabled={isLoading} className="px-4 py-2 rounded bg-blue-600 text-white font-medium hover:bg-blue-700 disabled:opacity-50">
                {isLoading ? 'Scheduling...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scheduling Info */}
      {item.scheduled_for && (
        <div className="mb-4 p-3 bg-blue-50 rounded-md">
          <div className="flex items-center text-sm text-blue-800">
            <CalendarIcon className="h-4 w-4 mr-2" />
            Scheduled for {format(new Date(item.scheduled_for), 'MMM d, yyyy h:mm a')}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-secondary-500 dark:text-secondary-400 pt-2 border-t border-secondary-200 dark:border-secondary-700">
        <span>
          Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>
        <span>
          Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
        </span>
      </footer>
    </article>
  )
} 