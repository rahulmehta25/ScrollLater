'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { useAuth } from '@/contexts/AuthContext'
import { getUserProfile, updateUserProfile, type UserProfile, type UserProfileUpdate } from '@/services/api'
import {
  User, Mail, Globe, Calendar, Bell, Clock,
  ArrowLeft, Loader2, Save, Camera, Check
} from 'lucide-react'

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
]

const BLOCK_DURATIONS = [15, 30, 45, 60, 90, 120]

export default function ProfilePage() {
  const router = useRouter()
  const { user, loading: authLoading } = useAuth()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Form state
  const [displayName, setDisplayName] = useState('')
  const [timezone, setTimezone] = useState('UTC')
  const [defaultBlockDuration, setDefaultBlockDuration] = useState(30)
  const [autoScheduleEnabled, setAutoScheduleEnabled] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login')
      return
    }

    if (user) {
      loadProfile()
    }
  }, [user, authLoading, router])

  const loadProfile = async () => {
    if (!user) return

    setLoading(true)
    const result = await getUserProfile(user.id)
    setLoading(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    const p = result.data
    setProfile(p)
    setDisplayName(p.display_name || '')
    setTimezone(p.timezone)
    setDefaultBlockDuration(p.default_block_duration)
    setAutoScheduleEnabled(p.auto_schedule_enabled)
    setAvatarUrl(user.user_metadata?.avatar_url || null)
  }

  const handleSave = async () => {
    if (!user) return

    setError(null)
    setSuccess(null)
    setSaving(true)

    const updates: UserProfileUpdate = {
      display_name: displayName || null,
      timezone,
      default_block_duration: defaultBlockDuration,
      auto_schedule_enabled: autoScheduleEnabled,
    }

    const result = await updateUserProfile(user.id, updates)
    setSaving(false)

    if (result.error) {
      setError(result.error.message)
      return
    }

    setProfile(result.data)
    setSuccess('Profile updated successfully')

    setTimeout(() => setSuccess(null), 3000)
  }

  const handleAvatarClick = () => {
    fileInputRef.current?.click()
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-2xl mx-auto px-4 py-8">
        <div className="mb-6">
          <Link
            href="/dashboard"
            className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            Back to dashboard
          </Link>
        </div>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-fade-in-scale">
          <div className="p-6 border-b border-gray-200">
            <h1 className="text-2xl font-bold text-gray-900">Profile Settings</h1>
            <p className="text-gray-600 mt-1">Manage your account and preferences</p>
          </div>

          {error && (
            <div className="mx-6 mt-6 p-4 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="mx-6 mt-6 p-4 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <Check className="w-5 h-5 text-green-600 mr-2" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="p-6 space-y-8">
            {/* Avatar Section */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <div
                  className="w-24 h-24 rounded-full bg-gradient-to-br from-orange-400 to-amber-500 flex items-center justify-center cursor-pointer overflow-hidden"
                  onClick={handleAvatarClick}
                >
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-3xl font-bold">
                      {displayName?.[0]?.toUpperCase() || user?.email?.[0]?.toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <button
                  onClick={handleAvatarClick}
                  className="absolute bottom-0 right-0 p-2 bg-white rounded-full shadow-lg border border-gray-200 hover:bg-gray-50 transition-colors"
                >
                  <Camera className="w-4 h-4 text-gray-600" />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">
                  {displayName || 'Set your name'}
                </h2>
                <p className="text-gray-500 text-sm">{user?.email}</p>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <User className="w-4 h-4 inline mr-2" />
                Display Name
              </label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name"
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow"
              />
            </div>

            {/* Email (read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Mail className="w-4 h-4 inline mr-2" />
                Email
              </label>
              <input
                type="email"
                value={user?.email || ''}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-xl bg-gray-50 text-gray-500"
              />
            </div>

            {/* Timezone */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Globe className="w-4 h-4 inline mr-2" />
                Timezone
              </label>
              <select
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow appearance-none bg-white"
              >
                {TIMEZONES.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Default Block Duration */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2" />
                Default Block Duration
              </label>
              <select
                value={defaultBlockDuration}
                onChange={(e) => setDefaultBlockDuration(Number(e.target.value))}
                className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent transition-shadow appearance-none bg-white"
              >
                {BLOCK_DURATIONS.map((duration) => (
                  <option key={duration} value={duration}>
                    {duration} minutes
                  </option>
                ))}
              </select>
              <p className="mt-2 text-sm text-gray-500">
                Default duration for scheduled content blocks
              </p>
            </div>

            {/* Auto Schedule Toggle */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div className="flex items-start space-x-3">
                <Calendar className="w-5 h-5 text-gray-600 mt-0.5" />
                <div>
                  <h3 className="font-medium text-gray-900">Auto-Schedule</h3>
                  <p className="text-sm text-gray-500">
                    Automatically schedule new items based on AI suggestions
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAutoScheduleEnabled(!autoScheduleEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  autoScheduleEnabled ? 'bg-orange-500' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    autoScheduleEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>

            {/* Notification Preferences */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">
                <Bell className="w-5 h-5 inline mr-2" />
                Notification Preferences
              </h3>

              <div className="space-y-4">
                <NotificationToggle
                  label="Email notifications"
                  description="Receive email reminders for scheduled items"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="Weekly digest"
                  description="Get a weekly summary of your saved content"
                  defaultChecked={true}
                />
                <NotificationToggle
                  label="AI insights"
                  description="Receive AI-powered content recommendations"
                  defaultChecked={false}
                />
              </div>
            </div>

            {/* Google Calendar Connection Status */}
            {profile && (
              <div className="border-t border-gray-200 pt-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">
                  <Calendar className="w-5 h-5 inline mr-2" />
                  Connected Services
                </h3>

                <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-white rounded-lg flex items-center justify-center shadow-sm">
                      <svg className="w-6 h-6" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                      </svg>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900">Google Calendar</h4>
                      <p className="text-sm text-gray-500">
                        {profile.google_calendar_connected ? 'Connected' : 'Not connected'}
                      </p>
                    </div>
                  </div>
                  {profile.google_calendar_connected ? (
                    <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                      <Check className="w-4 h-4 mr-1" />
                      Active
                    </span>
                  ) : (
                    <Link
                      href="/dashboard/settings"
                      className="text-sm text-orange-600 font-medium hover:text-orange-700"
                    >
                      Connect
                    </Link>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Save Button */}
          <div className="p-6 bg-gray-50 border-t border-gray-200">
            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-3 px-4 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-semibold rounded-xl hover:from-orange-600 hover:to-amber-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center"
            >
              {saving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  Save Changes
                </>
              )}
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="mt-8 bg-white rounded-2xl shadow-sm border border-red-200 overflow-hidden animate-fade-in-scale stagger-2">
          <div className="p-6">
            <h2 className="text-lg font-semibold text-red-600">Danger Zone</h2>
            <p className="text-gray-600 mt-1">
              Irreversible actions that affect your account
            </p>

            <div className="mt-4 space-y-4">
              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Export Data</h3>
                  <p className="text-sm text-gray-500">Download all your data</p>
                </div>
                <Link
                  href="/profile/export"
                  className="px-4 py-2 text-sm font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
                >
                  Export
                </Link>
              </div>

              <div className="flex items-center justify-between p-4 bg-red-50 rounded-xl">
                <div>
                  <h3 className="font-medium text-gray-900">Delete Account</h3>
                  <p className="text-sm text-gray-500">Permanently delete your account and all data</p>
                </div>
                <button className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors">
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

async function updateUserPreference(key: string, value: boolean) {
  try {
    const { createSupabaseClient, isSupabaseConfigured } = await import('@/lib/supabase')
    if (!isSupabaseConfigured()) return
    const supabase = createSupabaseClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase
      .from('user_preferences')
      .upsert({ user_id: user.id, [key]: value }, { onConflict: 'user_id' })
  } catch (e) {
    console.error('Failed to update preference:', e)
  }
}

function NotificationToggle({
  label,
  description,
  defaultChecked,
  preferenceKey
}: {
  label: string
  description: string
  defaultChecked: boolean
  preferenceKey?: string
}) {
  const [checked, setChecked] = useState(defaultChecked)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h4 className="font-medium text-gray-900">{label}</h4>
        <p className="text-sm text-gray-500">{description}</p>
      </div>
      <button
        type="button"
        onClick={() => {
          const next = !checked
          setChecked(next)
          if (preferenceKey) updateUserPreference(preferenceKey, next)
        }}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          checked ? 'bg-orange-500' : 'bg-gray-300'
        }`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            checked ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  )
}
