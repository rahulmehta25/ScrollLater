'use client'

import { useState } from 'react'
import { Brain, Loader2, Check, AlertCircle } from 'lucide-react'
import { Tooltip } from '@/components/ui/Tooltip'

interface AIAnalyzeButtonProps {
  entryId: string
  content: string
  url?: string
  onAnalysisComplete?: (analysis: unknown) => void
  className?: string
  variant?: 'primary' | 'secondary' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
}

export function AIAnalyzeButton({
  entryId,
  content,
  url,
  onAnalysisComplete,
  className = '',
  variant = 'secondary',
  size = 'md'
}: AIAnalyzeButtonProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [status, setStatus] = useState<'idle' | 'analyzing' | 'success' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const handleAnalyze = async () => {
    if (isAnalyzing) return

    setIsAnalyzing(true)
    setStatus('analyzing')
    setError(null)

    try {
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          entryId,
          content,
          url,
          useQueue: false // For immediate analysis
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Analysis failed')
      }

      const data = await response.json()
      
      if (data.queued) {
        setStatus('success')
        setTimeout(() => setStatus('idle'), 3000)
      } else {
        setStatus('success')
        if (onAnalysisComplete && data.analysis) {
          onAnalysisComplete(data.analysis)
        }
        setTimeout(() => setStatus('idle'), 3000)
      }
    } catch (err) {
      setStatus('error')
      setError(err instanceof Error ? err.message : 'Analysis failed')
      setTimeout(() => {
        setStatus('idle')
        setError(null)
      }, 5000)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const getVariantClasses = () => {
    const base = 'font-medium rounded-lg transition-all duration-200 inline-flex items-center justify-center'
    
    switch (variant) {
      case 'primary':
        return `${base} bg-blue-600 text-white hover:bg-blue-700 disabled:bg-blue-400`
      case 'secondary':
        return `${base} bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:bg-gray-50`
      case 'ghost':
        return `${base} text-gray-600 hover:text-gray-900 hover:bg-gray-50 disabled:text-gray-400`
    }
  }

  const getSizeClasses = () => {
    switch (size) {
      case 'sm':
        return 'px-3 py-1.5 text-sm gap-1.5'
      case 'lg':
        return 'px-6 py-3 text-base gap-3'
      default:
        return 'px-4 py-2 text-sm gap-2'
    }
  }

  const getIcon = () => {
    switch (status) {
      case 'analyzing':
        return <Loader2 className="animate-spin" size={size === 'sm' ? 14 : 16} />
      case 'success':
        return <Check size={size === 'sm' ? 14 : 16} />
      case 'error':
        return <AlertCircle size={size === 'sm' ? 14 : 16} />
      default:
        return <Brain size={size === 'sm' ? 14 : 16} />
    }
  }

  const getButtonText = () => {
    switch (status) {
      case 'analyzing':
        return 'Analyzing...'
      case 'success':
        return 'Analysis Complete'
      case 'error':
        return 'Analysis Failed'
      default:
        return 'Analyze with AI'
    }
  }

  const button = (
    <button
      onClick={handleAnalyze}
      disabled={isAnalyzing || !content}
      className={`${getVariantClasses()} ${getSizeClasses()} ${className}`}
    >
      {getIcon()}
      <span>{getButtonText()}</span>
    </button>
  )

  if (error) {
    return (
      <Tooltip content={error}>
        {button}
      </Tooltip>
    )
  }

  if (!content) {
    return (
      <Tooltip content="No content to analyze">
        {button}
      </Tooltip>
    )
  }

  return button
}