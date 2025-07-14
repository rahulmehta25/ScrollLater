// src/components/settings/ShortcutSetup.tsx
'use client';

import { useState, useEffect } from 'react';
import { createSupabaseClient } from '../../lib/supabase';

export function ShortcutSetup() {
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createSupabaseClient();

  useEffect(() => {
    const fetchToken = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('apple_shortcut_token')
          .single();
        setToken(profile?.apple_shortcut_token || 'No token found. Please contact support.');
      }
      setLoading(false);
    };

    fetchToken();
  }, [supabase]);

  const webhookUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/webhook-handler`;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mt-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">iOS Shortcut Setup</h3>
      {loading ? (
        <p>Loading your shortcut token...</p>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">Use this information to set up your iOS Shortcut for quick entry creation.</p>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Webhook URL</label>
              <input type="text" readOnly value={webhookUrl} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">Your User Token</label>
              <input type="text" readOnly value={token || ''} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-gray-100" />
            </div>
            <div>
              <h4 className="font-semibold">Shortcut Instructions:</h4>
              <ol className="list-decimal list-inside mt-2 text-sm text-gray-600">
                <li>Open the Shortcuts app on your iPhone.</li>
                <li>Create a new shortcut.</li>
                <li>Add a &ldquo;Get Clipboard&rdquo; action.</li>
                <li>Add a &ldquo;URL&rdquo; action and paste in the Webhook URL.</li>
                <li>Add a &ldquo;Get Contents of URL&rdquo; action.</li>
                <li>Set the method to POST.</li>
                <li>In the request body, add a JSON object with the following keys:</li>
                <ul className="list-disc list-inside ml-4">
                  <li>`content`: Set this to the clipboard content.</li>
                  <li>`userToken`: Set this to your User Token.</li>
                </ul>
                <li>Save the shortcut and add it to your home screen for easy access.</li>
              </ol>
            </div>
            <div className="bg-blue-50 p-4 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Shortcut Actions</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• &ldquo;Add to ScrollLater&rdquo; - Capture current page</li>
                <li>• &ldquo;Quick Note&rdquo; - Add text note</li>
                <li>• &ldquo;Read Later&rdquo; - Mark for reading</li>
                <li>• &ldquo;Build Later&rdquo; - Mark for building</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
