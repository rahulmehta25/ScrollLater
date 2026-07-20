'use client'

import { useState, useRef, useCallback, memo } from 'react'
import { format, formatDistanceToNow, addDays, formatISO } from 'date-fns'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  CalendarIcon, 
  LinkIcon, 
  EllipsisVerticalIcon,
  CheckIcon,
  ArchiveBoxIcon,
  TrashIcon,
  SparklesIcon,
  EyeIcon,
  TagIcon,
  ClockIcon,
  PencilIcon,
  ShareIcon,
  BookmarkIcon,
  HeartIcon
} from '@heroicons/react/24/outline'
import { 
  HeartIcon as HeartIconSolid,
  BookmarkIcon as BookmarkIconSolid
} from '@heroicons/react/24/solid'
import { Menu, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { clsx } from 'clsx'
import type { Database } from '../../lib/supabase'
import { createSupabaseClient } from '@/lib/supabase'
import { AIAnalysisDisplay } from '@/components/ai/AIAnalysisDisplay'
import { AIAnalyzeButton } from '@/components/ai/AIAnalyzeButton'
import { Button } from '@/components/ui/Button'
import { Modal, ConfirmDialog, useConfirmDialog } from '@/components/ui/Modal'
import { Badge } from '@/components/ui/Badge'
import { Input, Textarea } from '@/components/ui/Input'

type Entry = Database['public']['Tables']['entries']['Row']

interface EntryCardProps {
  item: Entry
  onUpdate: (itemId: string, updates: Partial<Entry>) => Promise<void>
  onDelete: (itemId: string) => Promise<void>
  index?: number
  isSelected?: boolean
  onSelect?: (id: string) => void
  compact?: boolean
  showActions?: boolean
  onFavorite?: (id: string, isFavorite: boolean) => Promise<void>
}

const STATUS_CONFIG = {
  inbox: { 
    label: 'Inbox', 
    color: 'bg-secondary-100 text-secondary-800 dark:bg-secondary-800 dark:text-secondary-200',
    icon: TagIcon
  },
  scheduled: { 
    label: 'Scheduled', 
    color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300',
    icon: CalendarIcon
  },
  completed: { 
    label: 'Completed', 
    color: 'bg-success-100 text-success-800 dark:bg-success-900/20 dark:text-success-300',
    icon: CheckIcon
  },
  archived: { 
    label: 'Archived', 
    color: 'bg-warning-100 text-warning-800 dark:bg-warning-900/20 dark:text-warning-300',
    icon: ArchiveBoxIcon
  }
}

const PRIORITY_CONFIG = {
  low: { label: 'Low', color: 'bg-secondary-100 text-secondary-600' },
  medium: { label: 'Medium', color: 'bg-warning-100 text-warning-700' },
  high: { label: 'High', color: 'bg-error-100 text-error-700' },
  urgent: { label: 'Urgent', color: 'bg-error-200 text-error-800' }
}

export const EnhancedEntryCard = memo(function EnhancedEntryCard({ 
  item, 
  onUpdate, 
  onDelete,
  index = 0,
  isSelected = false,
  onSelect,
  compact = false,
  showActions = true,
  onFavorite
}: EntryCardProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showScheduleModal, setShowScheduleModal] = useState(false)
  const [scheduleDate, setScheduleDate] = useState(() => formatISO(addDays(new Date(), 1), { representation: 'date' }))
  const [scheduleTime, setScheduleTime] = useState('14:00')
  const [scheduleDuration, setScheduleDuration] = useState(60)
  const [scheduleError, setScheduleError] = useState<string | null>(null)
  const [scheduleSuccess, setScheduleSuccess] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState(item.title || '')
  const [editContent, setEditContent] = useState(item.content || '')
  const [editCategory, setEditCategory] = useState(item.user_category || '')
  const [isFavorited, setIsFavorited] = useState(false) // In real app, this would come from user preferences
  const [isHovered, setIsHovered] = useState(false)
  
  const cardRef = useRef<HTMLElement>(null)
  const supabase = createSupabaseClient()
  const { confirm, ConfirmDialog } = useConfirmDialog()

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

  const handleStatusChange = useCallback(async (newStatus: Entry['status']) => {
    setIsLoading(true)
    try {
      await onUpdate(item.id, { status: newStatus })
    } catch (error) {
      console.error('Error updating status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [item.id, onUpdate])

  const handleEdit = useCallback(async () => {
    setIsLoading(true)
    try {
      await onUpdate(item.id, {
        title: editTitle,
        content: editContent,
        user_category: editCategory || null
      })
      setShowEditModal(false)
    } catch (error) {
      console.error('Error updating entry:', error)
    } finally {
      setIsLoading(false)
    }
  }, [item.id, onUpdate, editTitle, editContent, editCategory])

  const handleDelete = useCallback(async () => {
    const confirmed = await confirm({
      title: 'Delete Entry',
      message: 'Are you sure you want to delete this entry? This action cannot be undone.',
      confirmText: 'Delete',
      variant: 'destructive',
      onConfirm: () => {}
    })

    if (confirmed) {
      setIsLoading(true)
      try {
        await onDelete(item.id)
      } catch (error) {
        console.error('Error deleting entry:', error)
      } finally {
        setIsLoading(false)
      }
    }
  }, [confirm, item.id, onDelete])

  const handleFavorite = useCallback(async () => {
    const newFavoriteState = !isFavorited
    setIsFavorited(newFavoriteState)
    try {
      await onFavorite?.(item.id, newFavoriteState)
    } catch (error) {
      console.error('Error updating favorite:', error)
      setIsFavorited(!newFavoriteState) // Revert on error
    }
  }, [isFavorited, item.id, onFavorite])

  const handleSchedule = useCallback(async (suggestedTime: string) => {
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
  }, [item.id, onUpdate])

  const handleManualSchedule = useCallback(async () => {
    setIsLoading(true)
    setScheduleError(null)
    setScheduleSuccess(null)
    
    try {
      const scheduledDateTime = new Date(`${scheduleDate}T${scheduleTime}:00`)
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token
      
      if (!accessToken) {
        setScheduleError('Authentication error. Please log in again.')
        return
      }

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
        setScheduleError(data.error || 'Failed to schedule event')
        return
      }

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
  }, [item, scheduleDate, scheduleTime, scheduleDuration, onUpdate, supabase.auth])

  const handleKeyDown = useCallback((event: React.KeyboardEvent) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onSelect?.(item.id)
    } else if (event.key === 'Delete' && showActions) {
      event.preventDefault()
      handleDelete()
    }
  }, [item.id, onSelect, showActions, handleDelete])

  const statusConfig = STATUS_CONFIG[item.status]
  const priorityConfig = PRIORITY_CONFIG[item.priority as keyof typeof PRIORITY_CONFIG] || PRIORITY_CONFIG.medium
  const category = item.user_category || item.ai_category

  const cardVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { 
        delay: index * 0.1,
        type: "spring",
        stiffness: 300,
        damping: 25
      }
    },
    hover: { 
      y: -4,
      scale: 1.02,
      transition: { type: "spring", stiffness: 400, damping: 20 }
    }
  }

  const truncatedContent = item.ai_summary || item.content
  const shouldTruncate = truncatedContent.length > 150
  const displayContent = isExpanded || compact 
    ? truncatedContent 
    : shouldTruncate 
    ? `${truncatedContent.substring(0, 150)}...`
    : truncatedContent

  return (
    <>
      <motion.article
        ref={cardRef}
        className={clsx(
          'group relative rounded-xl border transition-all duration-200 cursor-pointer',
          'bg-white dark:bg-secondary-900',
          'border-secondary-200 dark:border-secondary-800',
          'hover:shadow-lg hover:border-primary-300 dark:hover:border-primary-700',
          isSelected && 'ring-2 ring-primary-500 border-primary-500',
          compact ? 'p-4' : 'p-6',
          isLoading && 'opacity-75 pointer-events-none'
        )}
        variants={cardVariants}
        initial="hidden"
        animate="visible"
        whileHover="hover"
        layout
        layoutId={`entry-${item.id}`}
        onClick={() => onSelect?.(item.id)}
        onKeyDown={handleKeyDown}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        role="article"
        tabIndex={0}
        aria-label={`Entry: ${item.title || 'Untitled Entry'}`}
        aria-selected={isSelected}
      >
        {/* Loading overlay */}
        <AnimatePresence>
          {isLoading && (
            <motion.div
              className="absolute inset-0 bg-white/50 dark:bg-secondary-900/50 rounded-xl flex items-center justify-center z-10"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <motion.div
                className="h-8 w-8 border-2 border-primary-300 border-t-primary-600 rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header */}
        <header className="flex items-start justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h3 className={clsx(
              'font-semibold text-secondary-900 dark:text-secondary-100 mb-2',
              compact ? 'text-sm' : 'text-base sm:text-lg',
              'truncate'
            )}>
              {item.title || 'Untitled Entry'}
            </h3>
            
            <div className="flex items-center flex-wrap gap-2">
              {/* Status badge */}
              <Badge 
                variant="secondary" 
                className={clsx('text-xs', statusConfig.color)}
                icon={<statusConfig.icon className="h-3 w-3" />}
              >
                {statusConfig.label}
              </Badge>
              
              {/* Priority badge */}
              <Badge 
                variant="secondary" 
                className={clsx('text-xs', priorityConfig.color)}
              >
                {priorityConfig.label}
              </Badge>
              
              {/* Category badge */}
              {category && (
                <Badge variant="outline" className="text-xs">
                  {category}
                </Badge>
              )}
              
              {/* Scheduled indicator */}
              {item.scheduled_for && (
                <Badge variant="outline" className="text-xs text-blue-600">
                  <ClockIcon className="h-3 w-3 mr-1" />
                  {format(new Date(item.scheduled_for), 'MMM d')}
                </Badge>
              )}
            </div>
          </div>

          {/* Actions */}
          {showActions && (
            <div className="flex items-center gap-1 ml-4">
              {/* Favorite button */}
              <Button
                variant="ghost"
                size="icon"
                onClick={(e) => {
                  e.stopPropagation()
                  handleFavorite()
                }}
                className={clsx(
                  'opacity-0 group-hover:opacity-100 transition-opacity',
                  isHovered && 'opacity-100',
                  isFavorited && 'text-error-600 dark:text-error-400'
                )}
                aria-label={isFavorited ? 'Remove from favorites' : 'Add to favorites'}
              >
                {isFavorited ? (
                  <HeartIconSolid className="h-4 w-4" />
                ) : (
                  <HeartIcon className="h-4 w-4" />
                )}
              </Button>

              {/* Actions menu */}
              <Menu as="div" className="relative">
                <Menu.Button 
                  as={Button}
                  variant="ghost"
                  size="icon"
                  onClick={(e: React.MouseEvent) => e.stopPropagation()}
                  className={clsx(
                    'opacity-0 group-hover:opacity-100 transition-opacity',
                    isHovered && 'opacity-100'
                  )}
                  aria-label="Entry actions menu"
                >
                  <EllipsisVerticalIcon className="h-4 w-4" />
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
                  <Menu.Items className="absolute right-0 mt-2 w-48 bg-white dark:bg-secondary-800 rounded-lg shadow-lg ring-1 ring-secondary-200 dark:ring-secondary-700 focus:outline-none z-20">
                    <div className="py-1">
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowEditModal(true)
                            }}
                            className={clsx(
                              active ? 'bg-secondary-100 dark:bg-secondary-700' : '',
                              'flex items-center w-full px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 transition-colors'
                            )}
                          >
                            <PencilIcon className="h-4 w-4 mr-2" />
                            Edit
                          </button>
                        )}
                      </Menu.Item>
                      
                      {item.status !== 'completed' && (
                        <Menu.Item>
                          {({ active }) => (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange('completed')
                              }}
                              className={clsx(
                                active ? 'bg-secondary-100 dark:bg-secondary-700' : '',
                                'flex items-center w-full px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 transition-colors'
                              )}
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
                              onClick={(e) => {
                                e.stopPropagation()
                                handleStatusChange('archived')
                              }}
                              className={clsx(
                                active ? 'bg-secondary-100 dark:bg-secondary-700' : '',
                                'flex items-center w-full px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 transition-colors'
                              )}
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
                            onClick={(e) => {
                              e.stopPropagation()
                              setShowScheduleModal(true)
                            }}
                            className={clsx(
                              active ? 'bg-secondary-100 dark:bg-secondary-700' : '',
                              'flex items-center w-full px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 transition-colors'
                            )}
                          >
                            <CalendarIcon className="h-4 w-4 mr-2" />
                            Schedule
                          </button>
                        )}
                      </Menu.Item>
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              navigator.share?.({
                                title: item.title || 'Entry',
                                text: item.content,
                                url: item.url || undefined
                              })
                            }}
                            className={clsx(
                              active ? 'bg-secondary-100 dark:bg-secondary-700' : '',
                              'flex items-center w-full px-4 py-2 text-sm text-secondary-700 dark:text-secondary-200 transition-colors'
                            )}
                          >
                            <ShareIcon className="h-4 w-4 mr-2" />
                            Share
                          </button>
                        )}
                      </Menu.Item>
                      
                      <Menu.Item>
                        {({ active }) => (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleDelete()
                            }}
                            className={clsx(
                              active ? 'bg-secondary-100 dark:bg-secondary-700' : '',
                              'flex items-center w-full px-4 py-2 text-sm text-error-700 dark:text-error-400 transition-colors'
                            )}
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
            </div>
          )}
        </header>

        {/* Content */}
        <div className="mb-4">
          <p className={clsx(
            'text-secondary-700 dark:text-secondary-300 leading-relaxed break-words',
            compact ? 'text-sm' : 'text-sm'
          )}>
            {displayContent}
          </p>
          
          {shouldTruncate && !compact && (
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation()
                setIsExpanded(!isExpanded)
              }}
              className="mt-2 text-primary-600 dark:text-primary-400 p-0 h-auto"
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </Button>
          )}
        </div>

        {/* AI Analysis Display */}
        {aiAnalysis && !compact && (
          <div className="mb-4">
            <AIAnalysisDisplay 
              analysis={aiAnalysis}
              onReanalyze={() => setAiAnalysis(null)}
            />
          </div>
        )}

        {/* AI Analyze Button */}
        {!aiAnalysis && item.content && !compact && (
          <div className="mb-4">
            <AIAnalyzeButton
              entryId={item.id}
              content={item.content}
              url={item.url || undefined}
              onAnalysisComplete={(analysis) => {
                setAiAnalysis(analysis as any)
                onUpdate(item.id, {
                  ai_summary: analysis.summary,
                  ai_category: analysis.category,
                  ai_tags: analysis.tags,
                  ai_confidence_score: analysis.confidence
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
            <Button
              as="a"
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              variant="ghost"
              size="sm"
              onClick={(e) => e.stopPropagation()}
              icon={<LinkIcon className="h-4 w-4" />}
              className="text-primary-600 dark:text-primary-400 p-0 h-auto"
            >
              Visit Link
            </Button>
          </div>
        )}

        {/* Tags */}
        {item.ai_tags && item.ai_tags.length > 0 && !compact && (
          <div className="mb-4">
            <div className="flex flex-wrap gap-1">
              {item.ai_tags.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  #{tag}
                </Badge>
              ))}
              {item.ai_tags.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{item.ai_tags.length - 3} more
                </Badge>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1 text-xs text-secondary-500 dark:text-secondary-400 pt-2 border-t border-secondary-200 dark:border-secondary-700">
          <span className="flex items-center gap-1">
            <ClockIcon className="h-3 w-3" />
            Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
          </span>
          <span className="flex items-center gap-1">
            <EyeIcon className="h-3 w-3" />
            Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
          </span>
        </footer>
      </motion.article>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Entry"
        size="lg"
      >
        <div className="space-y-4">
          <Input
            label="Title"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Enter a title for your entry"
          />
          
          <Textarea
            label="Content"
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            placeholder="Enter your content"
            rows={6}
          />
          
          <Input
            label="Category"
            value={editCategory}
            onChange={(e) => setEditCategory(e.target.value)}
            placeholder="Enter a category"
          />
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowEditModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              loading={isLoading}
            >
              Save Changes
            </Button>
          </div>
        </div>
      </Modal>

      {/* Schedule Modal */}
      <Modal
        isOpen={showScheduleModal}
        onClose={() => setShowScheduleModal(false)}
        title="Schedule Entry"
        size="md"
      >
        <div className="space-y-4">
          <Input
            label="Date"
            type="date"
            value={scheduleDate}
            onChange={(e) => setScheduleDate(e.target.value)}
          />
          
          <Input
            label="Time"
            type="time"
            value={scheduleTime}
            onChange={(e) => setScheduleTime(e.target.value)}
          />
          
          <div>
            <label className="block text-sm font-medium mb-1">Duration (minutes)</label>
            <select
              value={scheduleDuration}
              onChange={(e) => setScheduleDuration(Number(e.target.value))}
              className="w-full border rounded px-2 py-1"
            >
              <option value={15}>15</option>
              <option value={30}>30</option>
              <option value={45}>45</option>
              <option value={60}>60</option>
              <option value={90}>90</option>
              <option value={120}>120</option>
            </select>
          </div>
          
          {scheduleError && (
            <div className="text-error-600 text-sm">{scheduleError}</div>
          )}
          
          {scheduleSuccess && (
            <div className="text-success-600 text-sm">{scheduleSuccess}</div>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setShowScheduleModal(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleManualSchedule}
              loading={isLoading}
            >
              Schedule
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog />
    </>
  )
})