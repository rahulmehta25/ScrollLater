'use client'

import { useState } from 'react'
import { format, formatDistanceToNow } from 'date-fns'
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
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow animate-fade-in">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">
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
        <Menu as="div" className="relative">
          <Menu.Button className="p-2 text-gray-400 hover:text-gray-600">
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
            <Menu.Items className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none z-10">
              <div className="py-1">
                {item.status !== 'completed' && (
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
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
                        className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-gray-700`}
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
                      className={`${active ? 'bg-gray-100' : ''} flex items-center w-full px-4 py-2 text-sm text-red-700`}
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

      {/* Content */}
      <div className="mb-4">
        <p className="text-gray-700 text-sm leading-relaxed">
          {item.ai_summary || item.content}
        </p>
      </div>

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
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>
          Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
        </span>
        <span>
          Updated {formatDistanceToNow(new Date(item.updated_at), { addSuffix: true })}
        </span>
      </div>
    </div>
  )
} 