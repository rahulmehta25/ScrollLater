'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { createSupabaseClient } from '@/lib/supabase'
import { 
  ClipboardDocumentIcon, 
  CheckIcon,
  CalendarIcon,
  CogIcon,
  UserIcon
} from '@heroicons/react/24/outline'

export default function SettingsPage() {
  const { user } = useAuth()
  const [shortcutToken, setShortcutToken] = useState<string>('')
  const [copied, setCopied] = useState(false)
  const [loading, setLoading] = useState(true)
  const [userProfile, setUserProfile] = useState<{
    id: string;
    display_name?: string;
    apple_shortcut_token?: string;
    google_calendar_connected?: boolean;
    default_block_duration?: number;
    timezone?: string;
    auto_schedule_enabled?: boolean;
  } | null>(null)
  const supabase = createSupabaseClient()

  useEffect(() => {
    if (user) {
      fetchUserProfile()
    }
  }, [user]) // eslint-disable-line react-hooks/exhaustive-deps

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single()

      if (error) throw error

      setUserProfile(data)
      setShortcutToken(data.apple_shortcut_token || '')
    } catch (error) {
      console.error('Error fetching user profile:', error)
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortcutToken)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const generateNewToken = async () => {
    try {
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map(b => b.toString(16).padStart(2, '0'))
        .join('')

      const { error } = await supabase
        .from('user_profiles')
        .update({ apple_shortcut_token: newToken })
        .eq('id', user?.id)

      if (error) throw error

      setShortcutToken(newToken)
    } catch (error) {
      console.error('Error generating new token:', error)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account and preferences</p>
      </div>

      <div className="space-y-8">
        {/* User Profile Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <UserIcon className="h-6 w-6 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <p className="mt-1 text-sm text-gray-900">{user?.email}</p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <p className="mt-1 text-sm text-gray-900">
                {userProfile?.display_name || 'Not set'}
              </p>
            </div>
          </div>
        </div>

        {/* iOS Shortcuts Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CogIcon className="h-6 w-6 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">iOS Shortcuts</h2>
          </div>
          
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Use this token to connect your iOS Shortcuts for quick content capture without opening the app.
            </p>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Shortcut Token
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="text"
                  value={shortcutToken}
                  readOnly
                  className="flex-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-sm font-mono"
                />
                <button
                  onClick={copyToClipboard}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  {copied ? (
                    <CheckIcon className="h-4 w-4 text-green-600" />
                  ) : (
                    <ClipboardDocumentIcon className="h-4 w-4" />
                  )}
                </button>
                <button
                  onClick={generateNewToken}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                >
                  Regenerate
                </button>
              </div>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">How to use with iOS Shortcuts:</h3>
              <ol className="text-sm text-blue-700 space-y-1">
                <li>1. Open the Shortcuts app on your iPhone</li>
                <li>2. Create a new shortcut</li>
                <li>3. Add a "Get Contents of URL" action</li>
                <li>4. Set the URL to: <code className="bg-blue-100 px-1 rounded">https://your-domain.com/api/shortcuts/webhook</code></li>
                <li>5. Set method to POST and add headers:</li>
                <li className="ml-4">• Content-Type: application/json</li>
                <li>6. Add request body with your token and content</li>
              </ol>
            </div>
          </div>
        </div>

        {/* Calendar Integration Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CalendarIcon className="h-6 w-6 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Calendar Integration</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Google Calendar</h3>
                <p className="text-sm text-gray-600">
                  {userProfile?.google_calendar_connected 
                    ? 'Connected and ready to schedule events'
                    : 'Not connected'
                  }
                </p>
              </div>
              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                userProfile?.google_calendar_connected
                  ? 'bg-green-100 text-green-800'
                  : 'bg-gray-100 text-gray-800'
              }`}>
                {userProfile?.google_calendar_connected ? 'Connected' : 'Not Connected'}
              </span>
            </div>

            {!userProfile?.google_calendar_connected && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                <p className="text-sm text-yellow-800">
                  Connect your Google Calendar to automatically schedule time blocks for your entries.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Preferences Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center mb-4">
            <CogIcon className="h-6 w-6 text-gray-500 mr-2" />
            <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>
          </div>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Default Session Duration</label>
              <p className="mt-1 text-sm text-gray-900">
                {userProfile?.default_block_duration || 30} minutes
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Timezone</label>
              <p className="mt-1 text-sm text-gray-900">
                {userProfile?.timezone || 'UTC'}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700">Auto-schedule</label>
              <p className="mt-1 text-sm text-gray-900">
                {userProfile?.auto_schedule_enabled ? 'Enabled' : 'Disabled'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
