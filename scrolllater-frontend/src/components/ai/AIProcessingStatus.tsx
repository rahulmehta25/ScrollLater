'use client'

import { useEffect, useState } from 'react'
import { Loader2, CheckCircle, XCircle, Clock, AlertCircle } from 'lucide-react'

interface ProcessingStats {
  pending: number
  processing: number
  completed: number
  failed: number
  avgProcessingTime: number
}

interface ProcessingError {
  id: string
  taskType: string
  errorMessage: string
  createdAt: string
}

export function AIProcessingStatus({ userId }: { userId?: string }) {
  const [stats, setStats] = useState<ProcessingStats | null>(null)
  const [errors, setErrors] = useState<ProcessingError[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchStats()
    const interval = setInterval(fetchStats, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [userId])

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/ai/queue/stats')
      if (!response.ok) throw new Error('Failed to fetch stats')
      
      const data = await response.json()
      setStats(data.stats)
      setErrors(data.recentErrors || [])
      setError(null)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load stats')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 p-4 rounded-lg">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  if (!stats) return null

  const totalTasks = stats.pending + stats.processing + stats.completed + stats.failed
  const successRate = totalTasks > 0 ? (stats.completed / totalTasks * 100).toFixed(1) : '0'

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h3 className="text-lg font-semibold mb-4">AI Processing Status</h3>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-yellow-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <Clock className="h-5 w-5 text-yellow-600" />
            <span className="text-2xl font-bold text-yellow-900">{stats.pending}</span>
          </div>
          <p className="text-sm text-yellow-700 mt-1">Pending</p>
        </div>

        <div className="bg-blue-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <Loader2 className="h-5 w-5 text-blue-600 animate-spin" />
            <span className="text-2xl font-bold text-blue-900">{stats.processing}</span>
          </div>
          <p className="text-sm text-blue-700 mt-1">Processing</p>
        </div>

        <div className="bg-green-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <span className="text-2xl font-bold text-green-900">{stats.completed}</span>
          </div>
          <p className="text-sm text-green-700 mt-1">Completed</p>
        </div>

        <div className="bg-red-50 p-4 rounded-lg">
          <div className="flex items-center justify-between">
            <XCircle className="h-5 w-5 text-red-600" />
            <span className="text-2xl font-bold text-red-900">{stats.failed}</span>
          </div>
          <p className="text-sm text-red-700 mt-1">Failed</p>
        </div>
      </div>

      {/* Success Rate and Processing Time */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Success Rate</p>
          <p className="text-xl font-semibold text-gray-900">{successRate}%</p>
        </div>
        <div className="bg-gray-50 p-4 rounded-lg">
          <p className="text-sm text-gray-600">Avg Processing Time</p>
          <p className="text-xl font-semibold text-gray-900">
            {stats.avgProcessingTime ? `${(stats.avgProcessingTime / 1000).toFixed(1)}s` : 'N/A'}
          </p>
        </div>
      </div>

      {/* Recent Errors */}
      {errors.length > 0 && (
        <div className="mt-6">
          <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Errors</h4>
          <div className="space-y-2">
            {errors.map((error) => (
              <div key={error.id} className="bg-red-50 p-3 rounded-md">
                <div className="flex items-start">
                  <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 mr-2 flex-shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm text-red-700">
                      <span className="font-medium">{error.taskType}:</span> {error.errorMessage}
                    </p>
                    <p className="text-xs text-red-600 mt-1">
                      {new Date(error.createdAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Progress Bar */}
      {totalTasks > 0 && (
        <div className="mt-6">
          <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
            <div 
              className="h-full bg-green-500 transition-all duration-300"
              style={{ width: `${(stats.completed / totalTasks) * 100}%` }}
            />
          </div>
          <p className="text-xs text-gray-600 mt-1 text-center">
            {stats.completed} of {totalTasks} tasks completed
          </p>
        </div>
      )}
    </div>
  )
}