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
        const hasCode = urlParams.has('code');
        
        // If we have calendar connection status or OAuth code, try to restore session
        if (calendarStatus || hasCode) {
          console.log('SessionRestorer: Detected OAuth callback, attempting session restoration...');
          
          // Multiple attempts to restore session
          const attemptRestore = async (attempts = 0) => {
            if (attempts >= 5) {
              console.log('SessionRestorer: Max attempts reached, forcing page reload...');
              window.location.reload();
              return;
            }
            
            // Wait a bit for the OAuth callback to complete
            await new Promise(resolve => setTimeout(resolve, 1000));
            
            // Get the current session
            const { data: { session }, error } = await supabase.auth.getSession();
            
            if (error) {
              console.error('SessionRestorer: Error getting session:', error);
            } else if (session?.user) {
              console.log('SessionRestorer: Session restored successfully for user:', session.user.email);
              // Clear URL parameters and force a page reload to ensure AuthProvider picks up the session
              const newUrl = window.location.pathname;
              window.history.replaceState({}, '', newUrl);
              window.location.reload();
              return;
            } else {
              console.log(`SessionRestorer: No session found (attempt ${attempts + 1}), trying to refresh...`);
              // Try to refresh the session
              const { data: { session: refreshedSession }, error: refreshError } = await supabase.auth.refreshSession();
              
              if (refreshError) {
                console.error('SessionRestorer: Error refreshing session:', refreshError);
              } else if (refreshedSession?.user) {
                console.log('SessionRestorer: Session refreshed successfully for user:', refreshedSession.user.email);
                // Clear URL parameters and force a page reload
                const newUrl = window.location.pathname;
                window.history.replaceState({}, '', newUrl);
                window.location.reload();
                return;
              } else {
                // If still no session, try again
                setTimeout(() => {
                  attemptRestore(attempts + 1);
                }, 1000);
              }
            }
          };
          
          attemptRestore();
        }
      } catch (error) {
        console.error('SessionRestorer: Error during session restoration:', error);
      }
    };

    restoreSession();
  }, [supabase, router]);

  return null; // This component doesn't render anything
} 