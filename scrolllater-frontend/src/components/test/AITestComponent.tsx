'use client'

import { useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '../../contexts/AuthContext'

interface AIAnalysisResult {
  title?: string
  summary?: string
  category?: string
  tags?: string[]
  confidence?: number
  sentiment?: string
  urgency?: string
  estimatedReadTime?: number
  message?: string
  processingTime?: string
  analysis?: {
    title: string
    summary: string
    category: string
    tags: string[]
    confidence?: number
    sentiment?: string
    urgency?: string
    estimatedReadTime?: number
  }
  [key: string]: unknown
}

export function AITestComponent() {
  const [testContent, setTestContent] = useState('Learn about React hooks and modern state management patterns for building scalable applications.')
  const [isLoading, setIsLoading] = useState(false)
  const [result, setResult] = useState<AIAnalysisResult | null>(null)
  const [error, setError] = useState<string>('')
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  const testAIConnection = async () => {
    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      const response = await fetch('/api/test/openrouter')
      const data = await response.json()
      
      if (data.success) {
        setResult(data)
      } else {
        setError(data.error || 'Test failed')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Network error')
    } finally {
      setIsLoading(false)
    }
  }

  const testAIWithEntry = async () => {
    if (!user) {
      setError('Please log in to test AI with entry')
      return
    }

    setIsLoading(true)
    setError('')
    setResult(null)

    try {
      // Create a test entry
      const { data: newEntry, error: insertError } = await supabase
        .from('entries')
        .insert({
          user_id: user.id,
          content: testContent,
          original_input: testContent,
          source: 'test'
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Get the current access token
      const { data: { session } } = await supabase.auth.getSession()
      const accessToken = session?.access_token

      if (!accessToken) {
        throw new Error('No access token available')
      }

      // Trigger AI analysis
      const aiResponse = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          entryId: newEntry.id,
          content: testContent
        })
      })

      const aiResult = await aiResponse.json()

      if (aiResponse.ok) {
        setResult({
          success: true,
          message: 'AI analysis completed successfully',
          entry: newEntry,
          analysis: aiResult.analysis
        })
      } else {
        setError(aiResult.error || 'AI analysis failed')
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Test failed')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <h2 className="text-xl font-semibold text-gray-900 mb-4">AI Integration Test</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Test Content
          </label>
          <textarea
            value={testContent}
            onChange={(e) => setTestContent(e.target.value)}
            rows={3}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Enter content to test AI analysis..."
          />
        </div>

        <div className="flex space-x-4">
          <button
            onClick={testAIConnection}
            disabled={isLoading}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test OpenRouter Connection'}
          </button>

          <button
            onClick={testAIWithEntry}
            disabled={isLoading || !user}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
          >
            {isLoading ? 'Testing...' : 'Test AI with Entry'}
          </button>
        </div>

        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {result && (
          <div className="rounded-md bg-green-50 p-4">
            <h3 className="text-sm font-medium text-green-800 mb-2">Test Results</h3>
            <div className="text-sm text-green-700 space-y-2">
              <p><strong>Status:</strong> {result.message}</p>
              {result.processingTime && (
                <p><strong>Processing Time:</strong> {result.processingTime}</p>
              )}
              {result.analysis && (
                <div>
                  <p><strong>Title:</strong> {result.analysis.title}</p>
                  <p><strong>Summary:</strong> {result.analysis.summary}</p>
                  <p><strong>Category:</strong> {result.analysis.category}</p>
                  <p><strong>Tags:</strong> {result.analysis.tags.join(', ')}</p>
                  <p><strong>Confidence:</strong> {result.analysis.confidence}</p>
                  <p><strong>Sentiment:</strong> {result.analysis.sentiment}</p>
                  <p><strong>Urgency:</strong> {result.analysis.urgency}</p>
                  <p><strong>Read Time:</strong> {result.analysis.estimatedReadTime} minutes</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
} 