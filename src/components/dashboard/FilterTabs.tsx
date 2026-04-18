'use client'

import type { Database } from '@/lib/supabase'

type Entry = Database['public']['Tables']['entries']['Row']

interface FilterTabsProps {
  activeFilter: string
  onFilterChange: (filter: string) => void
  entries: Entry[]
}

export function FilterTabs({ activeFilter, onFilterChange, entries = [] }: FilterTabsProps) {
  const getCount = (status: string) => {
    if (status === 'all') return entries.length
    return entries.filter(entry => entry.status === status).length
  }

  const tabs = [
    { id: 'all', name: 'All', count: getCount('all') },
    { id: 'inbox', name: 'Inbox', count: getCount('inbox') },
    { id: 'scheduled', name: 'Scheduled', count: getCount('scheduled') },
    { id: 'completed', name: 'Completed', count: getCount('completed') },
    { id: 'archived', name: 'Archived', count: getCount('archived') }
  ]

  return (
    <div className="border-b border-gray-200">
      <nav className="-mb-px flex space-x-8">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onFilterChange(tab.id)}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeFilter === tab.id
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {tab.name}
            <span className="ml-2 bg-gray-100 text-gray-900 py-0.5 px-2.5 rounded-full text-xs">
              {tab.count}
            </span>
          </button>
        ))}
      </nav>
    </div>
  )
} 