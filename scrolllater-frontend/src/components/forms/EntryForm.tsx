'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { PlusIcon, LinkIcon, TagIcon, SparklesIcon } from '@heroicons/react/24/outline'
import { Tooltip, HelpText } from '@/components/ui/Tooltip'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Badge } from '@/components/ui/Badge'

const entrySchema = z.object({
  content: z.string().min(1, 'Please enter some content').max(2000, 'Content is too long'),
  url: z.string().url('Please enter a valid URL').optional().or(z.literal('')),
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

interface EntryFormProps {
  onSuccess?: () => void
  initialData?: Partial<EntryFormData>
  mode?: 'create' | 'edit'
}

export function EntryForm({ onSuccess, initialData, mode = 'create' }: EntryFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [aiProcessing, setAiProcessing] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<string>(initialData?.category || '')
  const [error, setError] = useState<string>('')
  const [success, setSuccess] = useState<string>('')
  const [urlPreview, setUrlPreview] = useState<string>('')
  const { user } = useAuth()
  const supabase = createSupabaseClient()

  const {
    register,
    handleSubmit,
    formState: { errors, isValid, isDirty },
    reset,
    watch,
    setValue,
    clearErrors
  } = useForm<EntryFormData>({
    resolver: zodResolver(entrySchema),
    defaultValues: initialData,
    mode: 'onChange'
  })

  const contentValue = watch('content')

  const detectUrl = (text: string) => {
    const urlRegex = /(https?:\/\/[^\s]+)/g
    const matches = text.match(urlRegex)
    if (matches && matches.length > 0) {
      setValue('url', matches[0])
      setValue('content', text.replace(matches[0], '').trim())
      setUrlPreview(matches[0])
      clearErrors('url')
    }
  }

  // Auto-save draft functionality
  useEffect(() => {
    const draftKey = `entry-draft-${user?.id}`
    const savedDraft = localStorage.getItem(draftKey)
    
    if (savedDraft && mode === 'create' && !initialData) {
      try {
        const draft = JSON.parse(savedDraft)
        if (draft.content || draft.url || draft.tags) {
          setValue('content', draft.content || '')
          setValue('url', draft.url || '')
          setValue('tags', draft.tags || '')
          setSelectedCategory(draft.category || '')
        }
      } catch (e) {
        console.error('Failed to load draft:', e)
      }
    }
  }, [user?.id, setValue, mode, initialData])

  // Save draft on changes
  useEffect(() => {
    if (!user?.id || mode !== 'create') return
    
    const draftKey = `entry-draft-${user.id}`
    const draft = {
      content: contentValue || '',
      url: watch('url') || '',
      tags: watch('tags') || '',
      category: selectedCategory
    }
    
    const timeoutId = setTimeout(() => {
      if (draft.content || draft.url || draft.tags) {
        localStorage.setItem(draftKey, JSON.stringify(draft))
      }
    }, 1000)
    
    return () => clearTimeout(timeoutId)
  }, [contentValue, watch, selectedCategory, user?.id, mode])

  const onSubmit = async (data: EntryFormData) => {
    if (!user) return

    setIsLoading(true)

    try {
      setError('')
      setSuccess('')
      
      // Parse tags
      const tags = data.tags 
        ? data.tags.split(',').map(tag => tag.trim()).filter(Boolean)
        : []

      // Create entry
      const { data: newEntry, error } = await supabase
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

      if (error) throw error

      // Trigger AI analysis
      setAiProcessing(true)
      try {
        // Get the current access token
        const { data: { session } } = await supabase.auth.getSession()
        const accessToken = session?.access_token

        if (accessToken) {
          const aiResponse = await fetch('/api/ai/analyze', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({
              entryId: newEntry.id,
              content: data.content,
              url: data.url
            })
          })

          if (aiResponse.ok) {
            const aiResult = await aiResponse.json()
            console.log('AI analysis completed:', aiResult)
          } else {
            console.error('AI analysis failed:', await aiResponse.text())
          }
        }
      } catch (aiError) {
        console.error('AI analysis error:', aiError)
        // Don't fail the entire submission if AI analysis fails
      } finally {
        setAiProcessing(false)
      }

      // Clear draft and reset form
      if (user?.id && mode === 'create') {
        localStorage.removeItem(`entry-draft-${user.id}`)
      }
      
      reset()
      setSelectedCategory('')
      setUrlPreview('')
      setSuccess('Entry created successfully!')
      onSuccess?.()

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(''), 3000)

    } catch (error) {
      console.error('Error creating entry:', error)
      setError(error instanceof Error ? error.message : 'Failed to create entry')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PlusIcon className="h-5 w-5" />
          {mode === 'create' ? 'Save Something for Later' : 'Edit Entry'}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6" noValidate>
          {/* Content Input */}
          <div>
            <label htmlFor="content" className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-2">
              What would you like to save?
              <Tooltip content="Paste a link, add a note, or describe any idea you want to revisit later" position="right">
                <span className="ml-1 text-secondary-400 cursor-help">ⓘ</span>
              </Tooltip>
            </label>
            <div className="relative">
              <textarea
                {...register('content')}
                id="content"
                rows={4}
                className="block w-full rounded-lg border-secondary-300 dark:border-secondary-600 bg-white dark:bg-secondary-800 text-secondary-900 dark:text-secondary-100 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm resize-none"
                placeholder="Paste a link, write a note, or describe an idea..."
                onChange={(e) => {
                  register('content').onChange(e)
                  detectUrl(e.target.value)
                }}
                aria-describedby={errors.content ? 'content-error' : 'content-help'}
              />
              <div className="absolute bottom-2 right-2 text-xs text-secondary-400">
                {contentValue?.length || 0}/2000
              </div>
            </div>
            {errors.content && (
              <p id="content-error" className="mt-1 text-sm text-error-600 dark:text-error-400" role="alert">
                {errors.content.message}
              </p>
            )}
            <HelpText text="Tip: Just paste a URL and we'll extract it automatically" />
          </div>

          {/* URL Input */}
          <div>
            <Input
              {...register('url')}
              label="URL (optional)"
              type="url"
              placeholder="https://example.com"
              icon={<LinkIcon className="h-4 w-4" />}
              error={!!errors.url}
              helperText={errors.url?.message}
              aria-describedby="url-help"
            />
            {urlPreview && (
              <div className="mt-2 p-2 bg-primary-50 dark:bg-primary-900/20 border border-primary-200 dark:border-primary-800 rounded-lg">
                <p className="text-sm text-primary-700 dark:text-primary-300">
                  <span className="font-medium">Detected URL:</span> {urlPreview}
                </p>
              </div>
            )}
            <HelpText id="url-help" text="We'll automatically extract URLs from your content" />
          </div>

          {/* Category Selection */}
          <div>
            <label className="block text-sm font-medium text-secondary-700 dark:text-secondary-300 mb-3">
              Category
              <Tooltip content="Choose a category to help organize your entries" position="right">
                <span className="ml-1 text-secondary-400 cursor-help">ⓘ</span>
              </Tooltip>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {CATEGORIES.map((category) => (
                <Button
                  key={category.name}
                  type="button"
                  variant={selectedCategory === category.name ? 'primary' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(
                    selectedCategory === category.name ? '' : category.name
                  )}
                  className="justify-start text-xs"
                >
                  <span className="mr-2 text-sm">{category.icon}</span>
                  {category.name}
                </Button>
              ))}
            </div>
            {selectedCategory && (
              <div className="mt-2">
                <Badge variant="primary" className="text-xs">
                  Selected: {selectedCategory}
                </Badge>
              </div>
            )}
          </div>

          {/* Tags Input */}
          <div>
            <Input
              {...register('tags')}
              label="Tags (comma-separated)"
              type="text"
              placeholder="productivity, tools, inspiration"
              icon={<TagIcon className="h-4 w-4" />}
              helperText="Add tags to make your entries easier to find later"
            />
          </div>

          {/* Status Messages */}
          {error && (
            <div className="rounded-lg bg-error-50 dark:bg-error-900/20 border border-error-200 dark:border-error-800 p-4" role="alert">
              <p className="text-sm text-error-800 dark:text-error-200">{error}</p>
            </div>
          )}
          
          {success && (
            <div className="rounded-lg bg-success-50 dark:bg-success-900/20 border border-success-200 dark:border-success-800 p-4" role="status">
              <p className="text-sm text-success-800 dark:text-success-200">{success}</p>
            </div>
          )}

          {/* Submit Button */}
          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <Button
              type="submit"
              loading={isLoading || aiProcessing}
              disabled={!isValid || !isDirty || !contentValue}
              className="flex-1"
              size="lg"
            >
              {isLoading ? (
                'Saving Entry...'
              ) : aiProcessing ? (
                <>
                  <SparklesIcon className="h-5 w-5 mr-2" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <PlusIcon className="h-5 w-5 mr-2" />
                  {mode === 'create' ? 'Save Entry' : 'Update Entry'}
                </>
              )}
            </Button>
            
            {mode === 'create' && isDirty && (
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  reset()
                  setSelectedCategory('')
                  setUrlPreview('')
                  if (user?.id) {
                    localStorage.removeItem(`entry-draft-${user.id}`)
                  }
                }}
                size="lg"
              >
                Clear
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  )
} 