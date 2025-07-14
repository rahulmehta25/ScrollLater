'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PlusIcon, LinkIcon, TagIcon } from '@heroicons/react/24/outline'

const entrySchema = z.object({
  content: z.string().min(1, 'Please enter some content'),
  url: z.string().url().optional().or(z.literal('')),
  category: z.string().optional(),
  tags: z.string().optional()
})

type EntryFormData = z.infer<typeof entrySchema>

const CATEGORIES = [
  { name: 'Read Later', icon: '📖', color: 'bg-blue-100 text-blue-800' },
  { name: 'Build', icon: '🔨', color: 'bg-green-100 text-green-800' },
  { name: 'Explore', icon: '🔍', color: 'bg-purple-100 text-purple-800' },
  { name: 'Todo', icon: '✅', color: 'bg-yellow-100 text-yellow-800' },
  { name: 'Schedule', icon: '📅', color: 'bg-red-100 text-red-800' },
  { name: 'Creative', icon: '🎨', color: 'bg-pink-100 text-pink-800' },
  { name: 'Learning', icon: '🎓', color: 'bg-cyan-100 text-cyan-800' },
  { name: 'Business', icon: '💼', color: 'bg-lime-100 text-lime-800' },
  { name: 'Personal', icon: '👤', color: 'bg-orange-100 text-orange-800' }
]

export function EntryForm({ onSuccess }: { onSuccess?: () => void }) {
  const [isLoading, setIsLoading] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>('')
  const [error, setError] = useState<string>('')
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
    watch,
    setValue
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema)
  })

  const contentValue = watch('content')

  const detectUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const matches = text.match(urlRegex)
    if (matches && matches.length > 0) {
      setValue('url', matches[0])
      setValue('content', text.replace(matches[0], '').trim())
    }
  }

  const onSubmit = async (data: EntryFormData) => {
    if (!user) {
      setError('Please sign in to create an entry')
      return
    }

    setIsLoading(true)
    setError('')

    try {
      // Parse tags
      const tags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : []

      // Create entry
      const { data: newEntry, error: insertError } = await supabase
        .from('entries')
        .insert({
          user_id: user.id,
          content: data.content,
          original_input: data.content,
          url: data.url || null,
          user_category: selectedCategory || null,
          user_tags: tags,
          source: 'web'
        })
        .select()
        .single()

      if (insertError) throw insertError

      // Call secure API route for AI analysis
      const response = await fetch('/api/ai/analyze', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          content: data.content,
          url: data.url
        })
      })

      if (!response.ok) {
        throw new Error('Failed to analyze content with AI')
      }

      const { analysis } = await response.json()

      // Update entry with AI analysis
      const { error: updateError } = await supabase
        .from('entries')
        .update({
          title: analysis.title,
          ai_summary: analysis.summary,
          ai_category: analysis.category,
          ai_tags: analysis.tags,
          ai_confidence_score: analysis.confidence,
          metadata: {
            sentiment: analysis.sentiment,
            urgency: analysis.urgency,
            estimated_read_time: analysis.estimatedReadTime,
            suggested_scheduling: analysis.suggestedScheduling
          }
        })
        .eq('id', newEntry.id)

      if (updateError) throw updateError

      // Reset form
      reset()
      setSelectedCategory('')
      onSuccess?.()

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create entry')
      console.error('Entry creation error:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Content Input */}
        <div>
          <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
            What would you like to save?
          </label>
          <textarea
            {...register('content')}
            rows={4}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="Paste a link, write a note, or describe an idea..."
            onChange={(e) => {
              register('content').onChange(e)
              detectUrl(e.target.value)
            }}
          />
          {errors.content && (
            <p className="mt-1 text-sm text-red-600">{errors.content.message}</p>
          )}
        </div>

        {/* URL Input */}
        <div>
          <label htmlFor="url" className="block text-sm font-medium text-gray-700 mb-2">
            <LinkIcon className="inline h-4 w-4 mr-1" />
            URL (optional)
          </label>
          <input
            {...register('url')}
            type="url"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="https://example.com"
          />
          {errors.url && (
            <p className="mt-1 text-sm text-red-600">{errors.url.message}</p>
          )}
        </div>

        {/* Category Selection */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Category
          </label>
          <div className="grid grid-cols-3 gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.name}
                type="button"
                onClick={() => setSelectedCategory(
                  selectedCategory === category.name ? '' : category.name
                )}
                className={`p-2 rounded-md text-xs font-medium transition-colors ${
                  selectedCategory === category.name
                    ? category.color
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-1">{category.icon}</span>
                {category.name}
              </button>
            ))}
          </div>
        </div>

        {/* Tags Input */}
        <div>
          <label htmlFor="tags" className="block text-sm font-medium text-gray-700 mb-2">
            <TagIcon className="inline h-4 w-4 mr-1" />
            Tags (comma-separated)
          </label>
          <input
            {...register('tags')}
            type="text"
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
            placeholder="productivity, tools, inspiration"
          />
        </div>

        {/* Error Display */}
        {error && (
          <div className="rounded-md bg-red-50 p-4">
            <p className="text-sm text-red-800">{error}</p>
          </div>
        )}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !contentValue}
          className="w-full flex justify-center items-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
          ) : (
            <>
              <PlusIcon className="h-5 w-5 mr-2" />
              Save Entry
            </>
          )}
        </button>
      </form>
    </div>
  )
} 