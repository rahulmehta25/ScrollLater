'use client'

import { useEffect, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { createSupabaseClient } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import { Check, Loader2, AlertCircle, Link as LinkIcon } from 'lucide-react'

function ShareTargetContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const [status, setStatus] = useState<'loading' | 'success' | 'error' | 'auth-required'>('loading')
  const [error, setError] = useState<string | null>(null)
  const supabase = createSupabaseClient()

  const title = searchParams?.get('title') || ''
  const text = searchParams?.get('text') || ''
  const url = searchParams?.get('url') || ''

  useEffect(() => {
    if (authLoading) return

    if (!user) {
      setStatus('auth-required')
      // Store shared data for after auth
      sessionStorage.setItem('pendingShare', JSON.stringify({ title, text, url }))
      return
    }

    saveContent()
  }, [user, authLoading, title, text, url])

  const saveContent = async () => {
    if (!user) return

    try {
      // Extract URL from text if not provided directly
      let contentUrl = url
      if (!contentUrl && text) {
        const urlMatch = text.match(/https?:\/\/[^\s]+/)
        if (urlMatch) {
          contentUrl = urlMatch[0]
        }
      }

      // Determine the content to save
      const content = text || title || contentUrl || 'Shared content'
      const contentTitle = title || (contentUrl ? new URL(contentUrl).hostname : 'Shared Item')

      const { error: insertError } = await supabase.from('entries').insert({
        user_id: user.id,
        url: contentUrl || null,
        title: contentTitle,
        content: content,
        original_input: JSON.stringify({ title, text, url }),
        source: 'share_target',
        status: 'inbox',
        metadata: {
          shared_at: new Date().toISOString(),
          share_source: 'web_share_api',
        },
      })

      if (insertError) {
        throw insertError
      }

      setStatus('success')

      // Redirect to dashboard after a short delay
      setTimeout(() => {
        router.push('/dashboard?saved=true')
      }, 1500)
    } catch (err) {
      console.error('Error saving shared content:', err)
      setError(err instanceof Error ? err.message : 'Failed to save content')
      setStatus('error')
    }
  }

  const handleSignIn = () => {
    router.push('/')
  }

  const handleRetry = () => {
    setStatus('loading')
    setError(null)
    saveContent()
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-lg p-6 max-w-md w-full text-center">
        {status === 'loading' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Saving Content</h1>
            <p className="text-gray-600">Adding this to your ScrollLater...</p>

            {(title || url || text) && (
              <div className="mt-4 p-3 bg-gray-50 rounded-lg text-left">
                {title && <p className="font-medium text-gray-900 truncate">{title}</p>}
                {url && (
                  <p className="text-sm text-blue-600 truncate flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    {url}
                  </p>
                )}
                {text && !url && (
                  <p className="text-sm text-gray-600 line-clamp-2">{text}</p>
                )}
              </div>
            )}
          </>
        )}

        {status === 'success' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
              <Check className="w-8 h-8 text-green-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Saved!</h1>
            <p className="text-gray-600">Content added to your inbox.</p>
            <p className="text-sm text-gray-500 mt-2">Redirecting to dashboard...</p>
          </>
        )}

        {status === 'error' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Failed to Save</h1>
            <p className="text-gray-600 mb-4">{error || 'Something went wrong. Please try again.'}</p>
            <div className="flex gap-3 justify-center">
              <button
                onClick={handleRetry}
                className="px-4 py-2 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors"
              >
                Try Again
              </button>
              <button
                onClick={() => router.push('/dashboard')}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
              >
                Go to Dashboard
              </button>
            </div>
          </>
        )}

        {status === 'auth-required' && (
          <>
            <div className="w-16 h-16 mx-auto mb-4 bg-orange-100 rounded-full flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-orange-500" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 mb-2">Sign In Required</h1>
            <p className="text-gray-600 mb-4">Please sign in to save this content to your ScrollLater.</p>

            {(title || url || text) && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg text-left">
                {title && <p className="font-medium text-gray-900 truncate">{title}</p>}
                {url && (
                  <p className="text-sm text-blue-600 truncate flex items-center gap-1">
                    <LinkIcon className="w-3 h-3" />
                    {url}
                  </p>
                )}
              </div>
            )}

            <button
              onClick={handleSignIn}
              className="w-full px-4 py-3 bg-orange-500 text-white rounded-lg hover:bg-orange-600 transition-colors font-medium"
            >
              Sign In to Save
            </button>
          </>
        )}
      </div>
    </div>
  )
}

export default function ShareTargetPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 text-orange-500 animate-spin" />
      </div>
    }>
      <ShareTargetContent />
    </Suspense>
  )
}
