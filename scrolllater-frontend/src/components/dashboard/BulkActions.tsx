'use client'

import { useState } from 'react'
import { 
  ArchiveBoxIcon, 
  TrashIcon, 
  CalendarIcon,
  CheckIcon
} from '@heroicons/react/24/outline'

interface BulkActionsProps {
  selectedCount: number
  onArchive: () => void
  onDelete: () => void
  onSchedule: () => void
  onMarkComplete: () => void
  disabled?: boolean
}

export function BulkActions({ 
  selectedCount, 
  onArchive, 
  onDelete, 
  onSchedule, 
  onMarkComplete,
  disabled = false 
}: BulkActionsProps) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const handleDelete = () => {
    if (showDeleteConfirm) {
      onDelete()
      setShowDeleteConfirm(false)
    } else {
      setShowDeleteConfirm(true)
      // Reset confirmation after 3 seconds
      setTimeout(() => setShowDeleteConfirm(false), 3000)
    }
  }

  if (selectedCount === 0) return null

  return (
    <div className="bg-white border-t border-gray-200 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center">
        <span className="text-sm text-gray-700">
          {selectedCount} {selectedCount === 1 ? 'item' : 'items'} selected
        </span>
      </div>
      
      <div className="flex items-center space-x-2">
        <button
          onClick={onMarkComplete}
          disabled={disabled}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          title="Mark as complete"
        >
          <CheckIcon className="h-4 w-4 mr-1" />
          Complete
        </button>

        <button
          onClick={onSchedule}
          disabled={disabled}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          title="Schedule selected items"
        >
          <CalendarIcon className="h-4 w-4 mr-1" />
          Schedule
        </button>

        <button
          onClick={onArchive}
          disabled={disabled}
          className="inline-flex items-center px-3 py-1.5 border border-gray-300 text-xs font-medium rounded text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
          title="Archive selected items"
        >
          <ArchiveBoxIcon className="h-4 w-4 mr-1" />
          Archive
        </button>

        <button
          onClick={handleDelete}
          disabled={disabled}
          className={`inline-flex items-center px-3 py-1.5 border text-xs font-medium rounded focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 ${
            showDeleteConfirm 
              ? 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100' 
              : 'border-gray-300 text-gray-700 bg-white hover:bg-gray-50'
          }`}
          title={showDeleteConfirm ? "Click again to confirm deletion" : "Delete selected items"}
        >
          <TrashIcon className="h-4 w-4 mr-1" />
          {showDeleteConfirm ? 'Click to Confirm' : 'Delete'}
        </button>
      </div>
    </div>
  )
}