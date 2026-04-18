'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient, type Database } from '@/lib/supabase'
import { useShareSheet } from '@/components/sharing/ShareSheet'
import {
  ArrowLeft,
  Calendar,
  Clock,
  ExternalLink,
  Loader2,
  Share2,
  Tag,
  Check,
  Bookmark,
  Archive,
} from 'lucide-react'
import { format } from 'date-fns'

type Entry = Database['public']['Tables']['entries']['Row']

interface EntryDetailClientProps {
  entryId: string
}

export function EntryDetailClient({ entryId }: EntryDetailClientProps) {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [entry, setEntry] = useState<Entry | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isOwner, setIsOwner] = useState(false)
  const supabase = createSupabaseClient()
  const { openShare, ShareSheetComponent } = useShareSheet()

  useEffect(() => {
    fetchEntry()
  }, [entryId, user])

  const fetchEntry = async () => {
    setLoading(true)
    setError(null)

    try {
      const { data, error: fetchError } = await supabase
        .from('entries')
        .select('*')
        .eq('id', entryId)
        .single()

      if (fetchError) {
        if (fetchError.code === 'PGRST116') {
          setError('Entry not found')
        } else {
          setError('Failed to load entry')
        }
        return
      }

      setEntry(data)
      setIsOwner(user?.id === data.user_id)
    } catch {
      setError('Failed to load entry')
    } finally {
      setLoading(false)
    }
  }

  const handleShare = () => {
    if (!entry) return

    const shareUrl = `${window.location.origin}/entry/${entry.id}`
    openShare({
      title: entry.title || 'Saved Content',
      text: entry.ai_summary || entry.content?.substring(0, 100) || '',
      url: shareUrl,
    })
  }

  const handleStatusChange = async (newStatus: Entry['status']) => {
    if (!entry || !isOwner) return

    const { error: updateError } = await supabase
      .from('entries')
      .update({
        status: newStatus,
        completed_at: newStatus === 'completed' ? new Date().toISOString() : null,
      })
      .eq('id', entry.id)

    if (!updateError) {
      setEntry({ ...entry, status: newStatus })
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    )
  }

  if (error || !entry) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {error || 'Entry Not Found'}
          </h1>
          <p className="text-gray-600 mb-4">
            This content may have been deleted or you don&apos;t have access to it.
          </p>
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    )
  }

  const category = entry.user_category || entry.ai_category
  const tags = [...(entry.user_tags || []), ...(entry.ai_tags || [])]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-5 h-5" />
            <span className="hidden sm:inline">Back</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShare}
              className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Share2 className="w-5 h-5" />
            </button>

            {entry.url && (
              <a
                href={entry.url}
                target="_blank"
                rel="noopener noreferrer"
                className="p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <ExternalLink className="w-5 h-5" />
              </a>
            )}
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="container mx-auto px-4 py-6 max-w-3xl">
        {/* Status Badge */}
        <div className="mb-4">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
            entry.status === 'completed' ? 'bg-green-100 text-green-700' :
            entry.status === 'scheduled' ? 'bg-blue-100 text-blue-700' :
            entry.status === 'archived' ? 'bg-gray-100 text-gray-700' :
            'bg-orange-100 text-orange-700'
          }`}>
            {entry.status === 'completed' && <Check className="w-4 h-4 mr-1" />}
            {entry.status === 'scheduled' && <Calendar className="w-4 h-4 mr-1" />}
            {entry.status === 'archived' && <Archive className="w-4 h-4 mr-1" />}
            {entry.status === 'inbox' && <Bookmark className="w-4 h-4 mr-1" />}
            {entry.status.charAt(0).toUpperCase() + entry.status.slice(1)}
          </span>
        </div>

        {/* Title */}
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 mb-4">
          {entry.title || 'Untitled'}
        </h1>

        {/* Meta */}
        <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500 mb-6">
          {entry.url && (
            <a
              href={entry.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-600 hover:underline truncate max-w-xs"
            >
              {new URL(entry.url).hostname}
            </a>
          )}
          <span className="flex items-center gap-1">
            <Clock className="w-4 h-4" />
            {format(new Date(entry.created_at), 'MMM d, yyyy')}
          </span>
          {entry.scheduled_for && (
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              Scheduled: {format(new Date(entry.scheduled_for), 'MMM d, yyyy h:mm a')}
            </span>
          )}
        </div>

        {/* Category & Tags */}
        {(category || tags.length > 0) && (
          <div className="flex flex-wrap items-center gap-2 mb-6">
            {category && (
              <span className="px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm font-medium">
                {category}
              </span>
            )}
            {tags.map((tag, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 text-gray-600 rounded-full text-xs"
              >
                <Tag className="w-3 h-3" />
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* AI Summary */}
        {entry.ai_summary && (
          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-blue-800 mb-2">AI Summary</h2>
            <p className="text-blue-900">{entry.ai_summary}</p>
          </div>
        )}

        {/* User Notes */}
        {entry.user_notes && (
          <div className="bg-yellow-50 border border-yellow-100 rounded-lg p-4 mb-6">
            <h2 className="text-sm font-semibold text-yellow-800 mb-2">Your Notes</h2>
            <p className="text-yellow-900">{entry.user_notes}</p>
          </div>
        )}

        {/* Content */}
        <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6">
          <div className="prose prose-gray max-w-none">
            {entry.content?.split('\n').map((paragraph, i) => (
              <p key={i}>{paragraph}</p>
            ))}
          </div>
        </div>

        {/* Actions (Owner Only) */}
        {isOwner && (
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Actions</h3>
            <div className="flex flex-wrap gap-2">
              {entry.status !== 'completed' && (
                <button
                  onClick={() => handleStatusChange('completed')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors text-sm"
                >
                  <Check className="w-4 h-4" />
                  Mark Complete
                </button>
              )}
              {entry.status !== 'archived' && (
                <button
                  onClick={() => handleStatusChange('archived')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm"
                >
                  <Archive className="w-4 h-4" />
                  Archive
                </button>
              )}
              {entry.status !== 'inbox' && (
                <button
                  onClick={() => handleStatusChange('inbox')}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-orange-100 text-orange-700 rounded-lg hover:bg-orange-200 transition-colors text-sm"
                >
                  <Bookmark className="w-4 h-4" />
                  Move to Inbox
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {ShareSheetComponent}
    </div>
  )
}
