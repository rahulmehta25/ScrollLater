'use client'

import { useState } from 'react'
import { Brain, Tag, Clock, Calendar, ChevronDown, ChevronUp, Sparkles } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'

interface AIAnalysis {
  title?: string
  summary?: string
  category?: string
  tags?: string[]
  confidence?: number
  sentiment?: 'positive' | 'neutral' | 'negative'
  urgency?: 'low' | 'medium' | 'high'
  estimatedReadTime?: number
  suggestedScheduling?: {
    timeOfDay: 'morning' | 'afternoon' | 'evening'
    duration: number
    priority: number
  }
}

interface AIAnalysisDisplayProps {
  analysis: AIAnalysis
  isProcessing?: boolean
  onReanalyze?: () => void
}

export function AIAnalysisDisplay({ analysis, isProcessing, onReanalyze }: AIAnalysisDisplayProps) {
  const [expanded, setExpanded] = useState(false)

  const getSentimentColor = (sentiment?: string) => {
    switch (sentiment) {
      case 'positive': return 'text-green-600 bg-green-50'
      case 'negative': return 'text-red-600 bg-red-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  const getUrgencyColor = (urgency?: string) => {
    switch (urgency) {
      case 'high': return 'text-red-600 bg-red-50'
      case 'medium': return 'text-yellow-600 bg-yellow-50'
      default: return 'text-green-600 bg-green-50'
    }
  }

  const getTimeOfDayIcon = (timeOfDay?: string) => {
    switch (timeOfDay) {
      case 'morning': return '🌅'
      case 'evening': return '🌆'
      default: return '☀️'
    }
  }

  if (isProcessing) {
    return (
      <div className="bg-blue-50 rounded-lg p-4 animate-pulse">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-blue-600 animate-pulse" />
          <span className="text-sm text-blue-700">AI is analyzing content...</span>
        </div>
      </div>
    )
  }

  if (!analysis || Object.keys(analysis).length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-5 w-5 text-gray-400" />
            <span className="text-sm text-gray-600">No AI analysis available</span>
          </div>
          {onReanalyze && (
            <button
              onClick={onReanalyze}
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              Analyze with AI
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Sparkles className="h-5 w-5 text-purple-600" />
          <span className="text-sm font-medium text-gray-900">AI Analysis</span>
          {analysis.confidence && (
            <Tooltip content={`${(analysis.confidence * 100).toFixed(0)}% confidence`}>
              <span className="text-xs text-gray-500">
                ({(analysis.confidence * 100).toFixed(0)}% confident)
              </span>
            </Tooltip>
          )}
        </div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="text-gray-500 hover:text-gray-700"
        >
          {expanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </button>
      </div>

      {/* Summary */}
      {analysis.summary && (
        <div className="text-sm text-gray-700 line-clamp-2">
          {analysis.summary}
        </div>
      )}

      {/* Quick Stats */}
      <div className="flex flex-wrap gap-2">
        {analysis.category && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
            {analysis.category}
          </span>
        )}
        
        {analysis.sentiment && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getSentimentColor(analysis.sentiment)}`}>
            {analysis.sentiment}
          </span>
        )}
        
        {analysis.urgency && (
          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getUrgencyColor(analysis.urgency)}`}>
            {analysis.urgency} urgency
          </span>
        )}
        
        {analysis.estimatedReadTime && (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-700">
            <Clock size={12} className="mr-1" />
            {analysis.estimatedReadTime} min
          </span>
        )}
      </div>

      {/* Expanded Details */}
      {expanded && (
        <div className="pt-3 mt-3 border-t border-gray-200 space-y-3">
          {/* Tags */}
          {analysis.tags && analysis.tags.length > 0 && (
            <div>
              <p className="text-xs font-medium text-gray-600 mb-1">Tags</p>
              <div className="flex flex-wrap gap-1">
                {analysis.tags.map((tag, index) => (
                  <span key={index} className="inline-flex items-center px-2 py-0.5 rounded text-xs bg-white text-gray-700">
                    <Tag size={10} className="mr-1" />
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Scheduling Suggestion */}
          {analysis.suggestedScheduling && (
            <div className="bg-white rounded p-3">
              <p className="text-xs font-medium text-gray-600 mb-2">
                <Calendar size={12} className="inline mr-1" />
                Scheduling Suggestion
              </p>
              <div className="space-y-1 text-xs text-gray-700">
                <p>
                  Best time: {getTimeOfDayIcon(analysis.suggestedScheduling.timeOfDay)} {analysis.suggestedScheduling.timeOfDay}
                </p>
                <p>Duration: {analysis.suggestedScheduling.duration} minutes</p>
                <p>Priority: {Array(analysis.suggestedScheduling.priority).fill('⭐').join('')}</p>
              </div>
            </div>
          )}

          {/* Re-analyze Button */}
          {onReanalyze && (
            <div className="pt-2">
              <button
                onClick={onReanalyze}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center"
              >
                <Brain size={12} className="mr-1" />
                Re-analyze with AI
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}