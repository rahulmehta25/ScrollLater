'use client'

import { useState, useEffect, useMemo } from 'react'
import { Rss, Plus, Trash2, RefreshCw, Loader2, Check, AlertCircle, ExternalLink } from 'lucide-react'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'

interface RSSFeed {
  id: string
  user_id: string
  url: string
  title: string
  description?: string
  site_url?: string
  image_url?: string
  last_fetched_at?: string
  auto_import: boolean
  created_at: string
}

export function RSSFeedManager() {
  const { user } = useAuth()
  const [feeds, setFeeds] = useState<RSSFeed[]>([])
  const [loading, setLoading] = useState(true)
  const [addingFeed, setAddingFeed] = useState(false)
  const [newFeedUrl, setNewFeedUrl] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [refreshing, setRefreshing] = useState<string | null>(null)
  const supabase = useMemo(() => createSupabaseClient(), [])

  useEffect(() => {
    if (user) {
      fetchFeeds()
    }
  }, [user])

  const fetchFeeds = async () => {
    try {
      const { data, error: fetchError } = await supabase
        .from('rss_feeds')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (fetchError) {
        // Table might not exist yet
        console.log('RSS feeds table not configured:', fetchError.message)
        setFeeds([])
      } else {
        setFeeds(data || [])
      }
    } catch {
      setFeeds([])
    } finally {
      setLoading(false)
    }
  }

  const handleAddFeed = async () => {
    if (!newFeedUrl.trim() || !user) return

    setError(null)
    setSuccess(null)
    setAddingFeed(true)

    try {
      // Validate URL
      try {
        new URL(newFeedUrl)
      } catch {
        throw new Error('Please enter a valid URL')
      }

      // Fetch and parse the feed
      const response = await fetch('/api/rss/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: newFeedUrl.trim() }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Failed to parse feed')
      }

      const feedData = await response.json()

      // Add feed to database
      const { error: insertError } = await supabase.from('rss_feeds').insert({
        user_id: user.id,
        url: newFeedUrl.trim(),
        title: feedData.title,
        description: feedData.description,
        site_url: feedData.link,
        image_url: feedData.image,
        auto_import: true,
      })

      if (insertError) {
        if (insertError.code === '23505') {
          throw new Error('This feed is already added')
        }
        throw new Error('Failed to save feed')
      }

      setSuccess(`Added "${feedData.title}"`)
      setNewFeedUrl('')
      fetchFeeds()

      // Import initial items
      await fetch('/api/rss/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: newFeedUrl.trim() }),
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add feed')
    } finally {
      setAddingFeed(false)
    }
  }

  const handleRemoveFeed = async (feedId: string) => {
    const { error: deleteError } = await supabase
      .from('rss_feeds')
      .delete()
      .eq('id', feedId)
      .eq('user_id', user?.id)

    if (!deleteError) {
      setFeeds(feeds.filter(f => f.id !== feedId))
      setSuccess('Feed removed')
    }
  }

  const handleRefreshFeed = async (feed: RSSFeed) => {
    setRefreshing(feed.id)

    try {
      const response = await fetch('/api/rss/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ feedUrl: feed.url }),
      })

      if (response.ok) {
        const data = await response.json()
        setSuccess(`Imported ${data.imported || 0} new articles`)

        // Update last_fetched_at
        await supabase
          .from('rss_feeds')
          .update({ last_fetched_at: new Date().toISOString() })
          .eq('id', feed.id)
      }
    } catch {
      setError('Failed to refresh feed')
    } finally {
      setRefreshing(null)
    }
  }

  const handleToggleAutoImport = async (feed: RSSFeed) => {
    const { error: updateError } = await supabase
      .from('rss_feeds')
      .update({ auto_import: !feed.auto_import })
      .eq('id', feed.id)

    if (!updateError) {
      setFeeds(feeds.map(f => f.id === feed.id ? { ...f, auto_import: !f.auto_import } : f))
    }
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center">
            <Rss className="w-5 h-5 text-orange-600" />
          </div>
          <div>
            <h3 className="font-medium text-gray-900">RSS Feed Import</h3>
            <p className="text-sm text-gray-500">
              Subscribe to RSS feeds to automatically save new articles.
            </p>
          </div>
        </div>
      </div>

      {/* Add Feed Form */}
      <div className="p-4 border-b border-gray-100 bg-gray-50">
        <div className="flex gap-2">
          <input
            type="url"
            value={newFeedUrl}
            onChange={(e) => setNewFeedUrl(e.target.value)}
            placeholder="Enter RSS feed URL..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
          />
          <button
            onClick={handleAddFeed}
            disabled={addingFeed || !newFeedUrl.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors text-sm font-medium disabled:opacity-50"
          >
            {addingFeed ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Plus className="w-4 h-4" />
            )}
            Add Feed
          </button>
        </div>

        {error && (
          <div className="mt-2 flex items-center gap-2 text-sm text-red-600">
            <AlertCircle className="w-4 h-4" />
            {error}
          </div>
        )}

        {success && (
          <div className="mt-2 flex items-center gap-2 text-sm text-green-600">
            <Check className="w-4 h-4" />
            {success}
          </div>
        )}
      </div>

      {/* Feed List */}
      <div className="divide-y divide-gray-100">
        {loading ? (
          <div className="p-8 text-center text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            Loading feeds...
          </div>
        ) : feeds.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Rss className="w-8 h-8 mx-auto mb-2 text-gray-300" />
            <p>No RSS feeds added yet.</p>
            <p className="text-sm">Add a feed URL above to get started.</p>
          </div>
        ) : (
          feeds.map((feed) => (
            <div key={feed.id} className="p-4 flex items-start gap-4">
              {feed.image_url ? (
                <img
                  src={feed.image_url}
                  alt=""
                  className="w-10 h-10 rounded-lg object-cover"
                />
              ) : (
                <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                  <Rss className="w-5 h-5 text-gray-400" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h4 className="font-medium text-gray-900 truncate">{feed.title}</h4>
                    {feed.description && (
                      <p className="text-sm text-gray-500 line-clamp-1">{feed.description}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1 truncate">{feed.url}</p>
                  </div>

                  <div className="flex items-center gap-1">
                    {feed.site_url && (
                      <a
                        href={feed.site_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-gray-400 hover:text-gray-600 rounded"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}
                    <button
                      onClick={() => handleRefreshFeed(feed)}
                      disabled={refreshing === feed.id}
                      className="p-1.5 text-gray-400 hover:text-gray-600 rounded disabled:opacity-50"
                      title="Refresh feed"
                    >
                      <RefreshCw className={`w-4 h-4 ${refreshing === feed.id ? 'animate-spin' : ''}`} />
                    </button>
                    <button
                      onClick={() => handleRemoveFeed(feed.id)}
                      className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                      title="Remove feed"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="mt-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-600">
                    <input
                      type="checkbox"
                      checked={feed.auto_import}
                      onChange={() => handleToggleAutoImport(feed)}
                      className="rounded text-orange-500"
                    />
                    Auto-import new articles
                  </label>

                  {feed.last_fetched_at && (
                    <span className="text-xs text-gray-400">
                      Last updated: {new Date(feed.last_fetched_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}
