'use client';

import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { createSupabaseClient } from '@/lib/supabase';
import type { UserProfile } from '@/services/api';
import {
  User,
  Mail,
  Bell,
  Calendar,
  Smartphone,
  Shield,
  Clock,
  Sparkles,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  Globe,
  Settings,
} from 'lucide-react';
import Link from 'next/link';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { Toggle } from '@/components/ui/Toggle';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { EmptyState } from '@/components/ui/EmptyState';
import { cn } from '@/lib/utils';

export default function SettingsPage() {
  const { user, loading: authLoading } = useAuth();
  const [shortcutToken, setShortcutToken] = useState<string>('');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);
  const [, setSaving] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const supabase = useMemo(() => createSupabaseClient(), []);

  useEffect(() => {
    if (authLoading) return;
    if (user) {
      fetchUserProfile();
    } else {
      setLoading(false);
    }
  }, [user, authLoading]);

  const fetchUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      setUserProfile(data);
      setShortcutToken(data.apple_shortcut_token || '');
    } catch (error) {
      console.error('Error fetching user profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateProfile = async (updates: Partial<UserProfile>) => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_profiles')
        .update(updates)
        .eq('id', user?.id);

      if (error) throw error;

      setUserProfile((prev) => (prev ? { ...prev, ...updates } : null));
    } catch (error) {
      console.error('Error updating profile:', error);
    } finally {
      setSaving(false);
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shortcutToken);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const generateNewToken = async () => {
    try {
      const newToken = Array.from(crypto.getRandomValues(new Uint8Array(32)))
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('');

      const { error } = await supabase
        .from('user_profiles')
        .update({ apple_shortcut_token: newToken })
        .eq('id', user?.id);

      if (error) throw error;

      setShortcutToken(newToken);
    } catch (error) {
      console.error('Error generating new token:', error);
    }
  };

  if (loading || authLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <Skeleton className="h-8 w-32 mb-2" />
        <Skeleton className="h-4 w-64 mb-8" />
        <div className="space-y-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <Skeleton className="h-5 w-24 mb-4" />
                <div className="space-y-4">
                  <Skeleton className="h-10 w-full" />
                  <Skeleton className="h-10 w-full" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 px-4 py-10">
        <div className="max-w-lg mx-auto">
          <div className="mb-6">
            <Link
              href="/"
              className="text-sm text-gray-500 hover:text-gray-800 transition-colors"
            >
              Back to library
            </Link>
          </div>
          <Card className="shadow-sm">
            <EmptyState
              icon={<Settings className="w-6 h-6" />}
              title="Settings need an account"
              description="You can keep exploring the demo library, digest, and save-link flow without signing in. Account settings unlock after login."
              action={{
                label: 'Back to library',
                onClick: () => {
                  window.location.href = '/';
                },
              }}
              secondaryAction={{
                label: 'Sign in',
                onClick: () => {
                  window.location.href = '/login';
                },
              }}
            />
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 pb-24 lg:pb-8">
      <div className="mb-8 animate-fade-in-up">
        <Link
          href="/"
          className="inline-block text-sm text-gray-500 hover:text-gray-800 transition-colors mb-3"
        >
          Back to library
        </Link>
        <h1 className="text-2xl font-semibold text-gray-900 tracking-tight">Settings</h1>
        <p className="text-sm text-gray-500 mt-1">Manage your account and preferences</p>
      </div>

      <div className="space-y-6">
        <div className="animate-fade-in-scale stagger-1">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <User className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">Profile</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <SettingsRow
                  icon={<Mail className="w-4 h-4" />}
                  label="Email"
                  value={user?.email || 'Not set'}
                />
                <SettingsRow
                  icon={<User className="w-4 h-4" />}
                  label="Display Name"
                  value={userProfile?.display_name || 'Not set'}
                  editable
                />
                <SettingsRow
                  icon={<Globe className="w-4 h-4" />}
                  label="Timezone"
                  value={userProfile?.timezone || 'UTC'}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-scale stagger-2">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">AI & Automation</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <Toggle
                  checked={userProfile?.notification_ai_insights ?? true}
                  onChange={(checked) => updateProfile({ notification_ai_insights: checked })}
                  label="AI Suggestions"
                  description="Get smart categorization and scheduling recommendations"
                />
                <Toggle
                  checked={userProfile?.auto_schedule_enabled ?? false}
                  onChange={(checked) => updateProfile({ auto_schedule_enabled: checked })}
                  label="Auto-schedule"
                  description="Automatically schedule new items based on your preferences"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-scale stagger-3">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Bell className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">Notifications</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <Toggle
                  checked={userProfile?.notification_email ?? true}
                  onChange={(checked) => updateProfile({ notification_email: checked })}
                  label="Push Notifications"
                  description="Get reminders for scheduled reading sessions"
                />
                <Toggle
                  checked={userProfile?.notification_weekly_digest ?? true}
                  onChange={(checked) => updateProfile({ notification_weekly_digest: checked })}
                  label="Email Digest"
                  description="Receive a daily summary of your reading list"
                />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-scale stagger-4">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">Reading Preferences</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Default Session Duration
                  </label>
                  <div className="flex gap-2">
                    {[15, 30, 45, 60].map((duration) => (
                      <button
                        key={duration}
                        onClick={() => updateProfile({ default_block_duration: duration })}
                        className={cn(
                          'px-4 py-2 text-sm font-medium rounded-lg border transition-colors',
                          userProfile?.default_block_duration === duration
                            ? 'bg-gray-900 text-white border-gray-900'
                            : 'bg-white text-gray-700 border-gray-200 hover:border-gray-300'
                        )}
                      >
                        {duration}m
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-scale stagger-5">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">Calendar Integration</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-white border border-gray-200 rounded-lg flex items-center justify-center">
                    <svg viewBox="0 0 24 24" className="w-5 h-5">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Google Calendar</p>
                    <p className="text-xs text-gray-500">
                      {userProfile?.google_calendar_connected
                        ? 'Connected and syncing'
                        : 'Not connected'}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {userProfile?.google_calendar_connected ? (
                    <>
                      <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                        <span className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                        Connected
                      </span>
                      <Button variant="ghost" size="sm">
                        Disconnect
                      </Button>
                    </>
                  ) : (
                    <Button size="sm">Connect</Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-scale stagger-6">
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">iOS Shortcuts</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <p className="text-sm text-gray-500 mb-4">
                Use this token to connect iOS Shortcuts for quick content capture.
              </p>
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Input
                    value={shortcutToken}
                    readOnly
                    className="flex-1 font-mono text-xs bg-gray-50"
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={copyToClipboard}
                    icon={copied ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={generateNewToken}
                    icon={<RefreshCw className="w-4 h-4" />}
                  />
                </div>
                <button className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  <ExternalLink className="w-3.5 h-3.5" />
                  View setup instructions
                </button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="animate-fade-in-scale" style={{ animationDelay: '0.35s' }}>
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center gap-2">
                <Shield className="w-4 h-4 text-gray-500" />
                <CardTitle className="text-sm font-medium">Security & Data</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="space-y-3">
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Export Data</p>
                    <p className="text-xs text-gray-500">Download all your saved content</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-gray-50 transition-colors text-left">
                  <div>
                    <p className="text-sm font-medium text-gray-900">Privacy Settings</p>
                    <p className="text-xs text-gray-500">Manage data collection preferences</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400" />
                </button>
                <button className="w-full flex items-center justify-between p-3 rounded-lg hover:bg-red-50 transition-colors text-left group">
                  <div>
                    <p className="text-sm font-medium text-red-600">Delete Account</p>
                    <p className="text-xs text-gray-500">Permanently delete your account and data</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-red-400" />
                </button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function SettingsRow({
  icon,
  label,
  value,
  editable = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  editable?: boolean;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <div className="flex items-center gap-3">
        <div className="text-gray-400">{icon}</div>
        <div>
          <p className="text-sm font-medium text-gray-900">{label}</p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-600">{value}</span>
        {editable && (
          <ChevronRight className="w-4 h-4 text-gray-400" />
        )}
      </div>
    </div>
  );
}
