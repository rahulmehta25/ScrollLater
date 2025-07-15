'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { createSupabaseClient } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const supabase = createSupabaseClient();

  console.log('AuthProvider: Initializing...');

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const ensureUserProfile = useCallback(async (user: User) => {
    if (!user) return;

    try {
      console.log('Ensuring user profile for:', user.email);
      
      // Use upsert to create the profile if it doesn't exist
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          apple_shortcut_token: generateShortcutToken()
        }, { onConflict: 'id' });

      if (error) {
        console.error('Error ensuring user profile:', error);
      } else {
        console.log('User profile ensured successfully');
      }
    } catch (error) {
      console.error('Error in ensureUserProfile:', error);
    }
  }, [supabase]);

  useEffect(() => {
    if (!mounted) return;

    console.log('AuthProvider: Setting up auth state listener...');

    // Immediately check for an existing session
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('AuthProvider: Initial session fetch:', session?.user?.email, 'Error:', error);
        
        if (error) {
          console.error('Session fetch error:', error);
        }
        
        setUser(session?.user ?? null);
        setSession(session);
        setLoading(false);

        if (session?.user) {
          ensureUserProfile(session.user);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setLoading(false);
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setSession(session);
        setLoading(false);

        if (event === 'SIGNED_IN' && session?.user) {
          ensureUserProfile(session.user);
        }
      }
    );

    // Also listen for storage events (in case session is restored from another tab)
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'sb-access-token' || e.key === 'sb-refresh-token') {
        console.log('AuthProvider: Storage change detected, rechecking session...');
        checkSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    return () => {
      subscription.unsubscribe();
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [supabase, mounted, ensureUserProfile]);

  const generateShortcutToken = () => {
    return 'sl_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  console.log('AuthProvider: Current state - loading:', loading, 'user:', user?.email, 'mounted:', mounted);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  const value = {
    user,
    session,
    loading,
    signOut
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 