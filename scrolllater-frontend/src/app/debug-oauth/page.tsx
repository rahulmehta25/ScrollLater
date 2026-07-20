'use client'

import { useEffect, useState } from 'react'
import { createSupabaseClient } from '@/lib/supabase'

interface DebugInfo {
  client: {
    supabaseUrl: string
    hasAnonKey: boolean
    appUrl: string
    currentOrigin: string
    hostname: string
  }
  auth: {
    isLoggedIn: boolean
    user: any
    session: any
  }
  environment: {
    nodeEnv: string
    userAgent: string
    timestamp: string
  }
}

export default function DebugOAuthPage() {
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null)
  const [loading, setLoading] = useState(true)
  const [testingOAuth, setTestingOAuth] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const supabase = createSupabaseClient()

  useEffect(() => {
    async function loadDebugInfo() {
      try {
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        const info: DebugInfo = {
          client: {
            supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL || 'NOT_SET',
            hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            appUrl: process.env.NEXT_PUBLIC_APP_URL || 'NOT_SET',
            currentOrigin: window.location.origin,
            hostname: window.location.hostname
          },
          auth: {
            isLoggedIn: !!session,
            user: session?.user || null,
            session: session || null
          },
          environment: {
            nodeEnv: process.env.NODE_ENV || 'unknown',
            userAgent: navigator.userAgent,
            timestamp: new Date().toISOString()
          }
        }

        setDebugInfo(info)
        
        if (sessionError) {
          setError(`Session error: ${sessionError.message}`)
        }
      } catch (err) {
        setError(`Debug info error: ${err instanceof Error ? err.message : 'Unknown error'}`)
      } finally {
        setLoading(false)
      }
    }

    loadDebugInfo()
  }, [])

  const testOAuthFlow = async (provider: 'google' | 'github') => {
    setTestingOAuth(true)
    setError(null)

    try {
      const redirectUrl = window.location.origin
      console.log('Testing OAuth with redirect:', `${redirectUrl}/api/auth/callback`)

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: `${redirectUrl}/api/auth/callback`,
          queryParams: {
            debug: 'true'
          }
        },
      })

      if (error) {
        throw error
      }

      // The redirect will happen automatically, so we don't need to do anything else
    } catch (err) {
      setError(`OAuth test error: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setTestingOAuth(false)
    }
  }

  if (loading) {
    return <div className="p-8">Loading debug information...</div>
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-6">OAuth Debug Information</h1>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}

      {debugInfo && (
        <div className="space-y-6">
          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Client Configuration</h2>
            <div className="space-y-2 text-sm font-mono">
              <div><strong>Supabase URL:</strong> {debugInfo.client.supabaseUrl}</div>
              <div><strong>Has Anon Key:</strong> {debugInfo.client.hasAnonKey ? 'Yes' : 'No'}</div>
              <div><strong>App URL (env):</strong> {debugInfo.client.appUrl}</div>
              <div><strong>Current Origin:</strong> {debugInfo.client.currentOrigin}</div>
              <div><strong>Hostname:</strong> {debugInfo.client.hostname}</div>
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Authentication Status</h2>
            <div className="space-y-2 text-sm">
              <div><strong>Logged In:</strong> {debugInfo.auth.isLoggedIn ? 'Yes' : 'No'}</div>
              {debugInfo.auth.user && (
                <div>
                  <strong>User:</strong>
                  <pre className="mt-1 p-2 bg-white rounded text-xs overflow-auto">
                    {JSON.stringify(debugInfo.auth.user, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>

          <div className="bg-gray-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Environment</h2>
            <div className="space-y-2 text-sm font-mono">
              <div><strong>Node Env:</strong> {debugInfo.environment.nodeEnv}</div>
              <div><strong>User Agent:</strong> {debugInfo.environment.userAgent}</div>
              <div><strong>Timestamp:</strong> {debugInfo.environment.timestamp}</div>
            </div>
          </div>

          <div className="bg-blue-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">OAuth Test</h2>
            <p className="text-sm text-gray-600 mb-4">
              Click to test the OAuth flow. This will redirect you to Google/GitHub and back.
            </p>
            <div className="space-x-4">
              <button
                onClick={() => testOAuthFlow('google')}
                disabled={testingOAuth}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {testingOAuth ? 'Testing...' : 'Test Google OAuth'}
              </button>
              <button
                onClick={() => testOAuthFlow('github')}
                disabled={testingOAuth}
                className="px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-900 disabled:opacity-50"
              >
                {testingOAuth ? 'Testing...' : 'Test GitHub OAuth'}
              </button>
            </div>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md">
            <h2 className="text-lg font-semibold mb-3">Expected Callback URLs</h2>
            <div className="space-y-2 text-sm font-mono">
              <div><strong>Local:</strong> http://localhost:3001/api/auth/callback</div>
              <div><strong>Production:</strong> https://scroll-later.vercel.app/api/auth/callback</div>
            </div>
            <p className="text-xs text-gray-600 mt-2">
              These URLs must be configured in your OAuth provider (Google/GitHub) settings.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}