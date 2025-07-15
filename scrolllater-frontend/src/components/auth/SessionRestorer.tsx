'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createSupabaseClient } from '@/lib/supabase';

export default function SessionRestorer() {
  const router = useRouter();
  const supabase = createSupabaseClient();

  useEffect(() => {
    const restoreSession = async () => {
      try {
        // Check if we're on a page that might have OAuth callback parameters
        const urlParams = new URLSearchParams(window.location.search);
        const calendarStatus = urlParams.get('calendar');
        
        // If we have calendar connection status, try to restore session
        if (calendarStatus) {
          console.log('SessionRestorer: Detected OAuth callback, attempting session restoration...');
          
          // Get the current session
          const { data: { session }, error } = await supabase.auth.getSession();
          
          if (error) {
            console.error('SessionRestorer: Error getting session:', error);
          } else if (session?.user) {
            console.log('SessionRestorer: Session restored successfully for user:', session.user.email);
          } else {
            console.log('SessionRestorer: No active session found, user may need to log in');
          }
        }
      } catch (error) {
        console.error('SessionRestorer: Error during session restoration:', error);
      }
    };

    restoreSession();
  }, [supabase, router]);

  return null; // This component doesn't render anything
} 