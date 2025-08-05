'use client'

import { useState, useRef } from 'react'
import { UserIcon, CameraIcon } from '@heroicons/react/24/outline'
import { createSupabaseClient } from '@/lib/supabase'
import Image from 'next/image'

interface ProfileSettingsProps {
  userProfile: {
    id: string
    display_name?: string
    timezone?: string
    default_block_duration?: number
    auto_schedule_enabled?: boolean
    avatar_url?: string
  } | null
  userEmail?: string
  onUpdate: () => void
}

// Common timezones
const TIMEZONES = [
  { value: 'UTC', label: 'UTC (Coordinated Universal Time)' },
  { value: 'America/New_York', label: 'Eastern Time (US & Canada)' },
  { value: 'America/Chicago', label: 'Central Time (US & Canada)' },
  { value: 'America/Denver', label: 'Mountain Time (US & Canada)' },
  { value: 'America/Los_Angeles', label: 'Pacific Time (US & Canada)' },
  { value: 'Europe/London', label: 'London' },
  { value: 'Europe/Paris', label: 'Paris' },
  { value: 'Europe/Berlin', label: 'Berlin' },
  { value: 'Asia/Tokyo', label: 'Tokyo' },
  { value: 'Asia/Shanghai', label: 'Shanghai' },
  { value: 'Asia/Kolkata', label: 'Mumbai' },
  { value: 'Australia/Sydney', label: 'Sydney' },
]

// Duration options (in minutes)
const DURATION_OPTIONS = [
  { value: 15, label: '15 minutes' },
  { value: 30, label: '30 minutes' },
  { value: 45, label: '45 minutes' },
  { value: 60, label: '1 hour' },
  { value: 90, label: '1.5 hours' },
  { value: 120, label: '2 hours' },
]

export function ProfileSettingsWithAvatar({ userProfile, userEmail, onUpdate }: ProfileSettingsProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [saving, setSaving] = useState(false)
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(userProfile?.avatar_url || '')
  const [formData, setFormData] = useState({
    display_name: userProfile?.display_name || '',
    timezone: userProfile?.timezone || 'UTC',
    default_block_duration: userProfile?.default_block_duration || 30,
    auto_schedule_enabled: userProfile?.auto_schedule_enabled || false,
  })
  const fileInputRef = useRef<HTMLInputElement>(null)
  const supabase = createSupabaseClient()

  const handleAvatarUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file || !userProfile?.id) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please upload an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('File size must be less than 5MB')
      return
    }

    setUploadingAvatar(true)
    try {
      // Generate unique file name
      const fileExt = file.name.split('.').pop()
      const fileName = `${userProfile.id}/avatar-${Date.now()}.${fileExt}`

      // Upload to Supabase Storage
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: true
        })

      if (uploadError) throw uploadError

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(fileName)

      // Update user profile with new avatar URL
      const { error: updateError } = await supabase
        .from('user_profiles')
        .update({ avatar_url: publicUrl })
        .eq('id', userProfile.id)

      if (updateError) throw updateError

      setAvatarUrl(publicUrl)
      onUpdate()
    } catch (error) {
      console.error('Error uploading avatar:', error)
      alert('Failed to upload avatar')
    } finally {
      setUploadingAvatar(false)
    }
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(formData)
        .eq('id', userProfile?.id)

      if (error) throw error

      setIsEditing(false)
      onUpdate()
    } catch (error) {
      console.error('Error updating profile:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setFormData({
      display_name: userProfile?.display_name || '',
      timezone: userProfile?.timezone || 'UTC',
      default_block_duration: userProfile?.default_block_duration || 30,
      auto_schedule_enabled: userProfile?.auto_schedule_enabled || false,
    })
    setIsEditing(false)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <UserIcon className="h-6 w-6 text-gray-500 mr-2" />
          <h2 className="text-xl font-semibold text-gray-900">Profile</h2>
        </div>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="text-sm text-primary-600 hover:text-primary-700 font-medium"
          >
            Edit
          </button>
        )}
      </div>
      
      <div className="space-y-4">
        {/* Avatar Section */}
        <div className="flex items-center space-x-4">
          <div className="relative">
            {avatarUrl ? (
              <Image
                src={avatarUrl}
                alt="Profile"
                width={80}
                height={80}
                className="h-20 w-20 rounded-full object-cover"
              />
            ) : (
              <div className="h-20 w-20 rounded-full bg-gray-200 flex items-center justify-center">
                <UserIcon className="h-10 w-10 text-gray-400" />
              </div>
            )}
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingAvatar}
              className="absolute bottom-0 right-0 bg-primary-600 rounded-full p-1.5 text-white hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
              title="Change profile photo"
            >
              {uploadingAvatar ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
              ) : (
                <CameraIcon className="h-4 w-4" />
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleAvatarUpload}
              className="hidden"
            />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-700">Profile Photo</p>
            <p className="text-xs text-gray-500">Click the camera icon to upload</p>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <p className="mt-1 text-sm text-gray-900">{userEmail}</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Display Name</label>
          {isEditing ? (
            <input
              type="text"
              value={formData.display_name}
              onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
              placeholder="Enter your name"
            />
          ) : (
            <p className="mt-1 text-sm text-gray-900">
              {userProfile?.display_name || 'Not set'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Timezone</label>
          {isEditing ? (
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz.value} value={tz.value}>
                  {tz.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-gray-900">
              {TIMEZONES.find(tz => tz.value === userProfile?.timezone)?.label || userProfile?.timezone || 'UTC'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Default Session Duration</label>
          {isEditing ? (
            <select
              value={formData.default_block_duration}
              onChange={(e) => setFormData({ ...formData, default_block_duration: parseInt(e.target.value) })}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm"
            >
              {DURATION_OPTIONS.map((duration) => (
                <option key={duration.value} value={duration.value}>
                  {duration.label}
                </option>
              ))}
            </select>
          ) : (
            <p className="mt-1 text-sm text-gray-900">
              {DURATION_OPTIONS.find(d => d.value === userProfile?.default_block_duration)?.label || '30 minutes'}
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Auto-schedule</label>
          {isEditing ? (
            <div className="mt-1">
              <label className="inline-flex items-center">
                <input
                  type="checkbox"
                  checked={formData.auto_schedule_enabled}
                  onChange={(e) => setFormData({ ...formData, auto_schedule_enabled: e.target.checked })}
                  className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                />
                <span className="ml-2 text-sm text-gray-900">
                  Automatically schedule new entries
                </span>
              </label>
            </div>
          ) : (
            <p className="mt-1 text-sm text-gray-900">
              {userProfile?.auto_schedule_enabled ? 'Enabled' : 'Disabled'}
            </p>
          )}
        </div>

        {isEditing && (
          <div className="flex justify-end space-x-3 pt-4">
            <button
              onClick={handleCancel}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}