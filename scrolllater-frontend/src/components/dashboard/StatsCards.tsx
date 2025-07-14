'use client'

import { 
  DocumentTextIcon, 
  ClockIcon, 
  CheckCircleIcon, 
  ArchiveBoxIcon 
} from '@heroicons/react/24/outline'
import type { Database } from '@/lib/supabase'

type Entry = Database['public']['Tables']['entries']['Row']

interface StatsCardsProps {
  entries: Entry[]
}

export function StatsCards({ entries = [] }: StatsCardsProps) {
  const stats = [
    {
      name: 'Total Items',
      value: entries.length,
      icon: DocumentTextIcon,
      color: 'bg-blue-500'
    },
    {
      name: 'Inbox',
      value: entries.filter(entry => entry.status === 'inbox').length,
      icon: ClockIcon,
      color: 'bg-yellow-500'
    },
    {
      name: 'Completed',
      value: entries.filter(entry => entry.status === 'completed').length,
      icon: CheckCircleIcon,
      color: 'bg-green-500'
    },
    {
      name: 'Archived',
      value: entries.filter(entry => entry.status === 'archived').length,
      icon: ArchiveBoxIcon,
      color: 'bg-gray-500'
    }
  ]

  return (
    <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat) => (
        <div
          key={stat.name}
          className="bg-white overflow-hidden shadow rounded-lg"
        >
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <stat.icon className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    {stat.name}
                  </dt>
                  <dd className="text-lg font-medium text-gray-900">
                    {stat.value}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  )
} 