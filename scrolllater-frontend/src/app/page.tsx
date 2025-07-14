'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [connectionStatus, setConnectionStatus] = useState<string>('Checking connection...');

  useEffect(() => {
    // Check Supabase connection
    const checkConnection = async () => {
      try {
        const supabase = createSupabaseClient();
        const { error } = await supabase.from('user_profiles').select('count').limit(1);
        
        if (error) {
          setConnectionStatus('❌ Supabase connection failed');
        } else {
          setConnectionStatus('✅ Supabase connection configured!');
        }
      } catch {
        setConnectionStatus('❌ Supabase connection failed');
      }
    };

    checkConnection();
  }, []);

  useEffect(() => {
    if (!loading) {
      if (user) {
        router.push('/dashboard');
      }
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="container mx-auto px-4 py-16">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-5xl font-bold text-gray-900 mb-6">
            ScrollLater
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Capture, organize, and intelligently schedule your content consumption
          </p>
          
          <div className="bg-white rounded-lg shadow-lg p-8 mb-8">
            <h2 className="text-2xl font-semibold text-gray-800 mb-4">
              Welcome to ScrollLater
            </h2>
            <p className="text-gray-600 mb-6">
              Your personal content management platform that helps you capture links, 
              ideas, and tasks from various sources and intelligently schedule time to revisit them.
            </p>
            
            <div className="bg-blue-50 rounded-lg p-4 mb-6">
              <p className="text-sm text-blue-800 font-medium">
                {connectionStatus}
              </p>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-500">
                <span>✅ Next.js 15</span>
                <span>✅ TypeScript</span>
                <span>✅ TailwindCSS</span>
                <span>✅ Supabase</span>
              </div>
            </div>
          </div>
          
          <div className="text-center">
            <p className="text-gray-500 mb-4">
              Please sign in to access your dashboard
            </p>
            <a
              href="/dashboard"
              className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
            >
              Go to Dashboard
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
