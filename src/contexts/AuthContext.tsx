'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  error: string | null;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isConfigured = isSupabaseConfigured();

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const ensureUserProfile = useCallback(async (currentUser: User) => {
    if (!currentUser || !isConfigured) return;

    try {
      const supabase = createSupabaseClient();
      const { error: upsertError } = await supabase
        .from('user_profiles')
        .upsert({
          id: currentUser.id,
          display_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          avatar_url: currentUser.user_metadata?.avatar_url || null,
          apple_shortcut_token: 'sl_' + crypto.randomUUID().replace(/-/g, '').substring(0, 24)
        }, { onConflict: 'id' });

      if (upsertError) {
        console.error('AuthProvider: Error ensuring user profile:', upsertError);
      }
    } catch (err) {
      console.error('AuthProvider: Error in ensureUserProfile:', err);
    }
  }, [isConfigured]);

  const updateAuthState = useCallback((newSession: Session | null) => {
    setUser(newSession?.user ?? null);
    setSession(newSession);
    setLoading(false);
    setError(null);

    if (newSession?.user) {
      ensureUserProfile(newSession.user);
    }
  }, [ensureUserProfile]);

  const refreshSession = useCallback(async () => {
    if (!isConfigured) return;

    try {
      const supabase = createSupabaseClient();
      const { data, error: refreshError } = await supabase.auth.refreshSession();

      if (refreshError) {
        console.error('AuthProvider: Error refreshing session:', refreshError);
        setError('Session refresh failed');
        // If refresh fails, sign out
        await supabase.auth.signOut();
        return;
      }

      if (data.session) {
        updateAuthState(data.session);
      }
    } catch (err) {
      console.error('AuthProvider: Error refreshing session:', err);
      setError('An unexpected error occurred');
    }
  }, [isConfigured, updateAuthState]);

  useEffect(() => {
    if (!mounted) return;

    if (!isConfigured) {
      setLoading(false);
      return;
    }

    const supabase = createSupabaseClient();

    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError) {
          console.error('AuthProvider: Initial session fetch error:', sessionError);
          setError('Failed to get session');
          setLoading(false);
          return;
        }

        updateAuthState(initialSession);

        // Check if session is about to expire (within 5 minutes)
        if (initialSession?.expires_at) {
          const expiresAt = new Date(initialSession.expires_at * 1000);
          const now = new Date();
          const fiveMinutes = 5 * 60 * 1000;

          if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
            refreshSession();
          }
        }
      } catch (err) {
        console.error('AuthProvider: Error getting initial session:', err);
        setError('An unexpected error occurred');
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, newSession: Session | null) => {
        updateAuthState(newSession);

        // Handle specific auth events
        switch (event) {
          case 'SIGNED_OUT':
            setUser(null);
            setSession(null);
            break;
          case 'TOKEN_REFRESHED':
            console.log('AuthProvider: Token refreshed');
            break;
          case 'PASSWORD_RECOVERY':
            console.log('AuthProvider: Password recovery initiated');
            break;
        }
      }
    );

    // Set up automatic session refresh
    const refreshInterval = setInterval(() => {
      if (session?.expires_at) {
        const expiresAt = new Date(session.expires_at * 1000);
        const now = new Date();
        const fiveMinutes = 5 * 60 * 1000;

        if (expiresAt.getTime() - now.getTime() < fiveMinutes) {
          refreshSession();
        }
      }
    }, 60000); // Check every minute

    return () => {
      subscription.unsubscribe();
      clearInterval(refreshInterval);
    };
  }, [mounted, updateAuthState, refreshSession, isConfigured, session?.expires_at]);

  const signOut = async () => {
    if (!isConfigured) return;

    try {
      const supabase = createSupabaseClient();
      const { error: signOutError } = await supabase.auth.signOut();

      if (signOutError) {
        console.error('AuthProvider: Sign out error:', signOutError);
        setError('Failed to sign out');
        return;
      }

      setUser(null);
      setSession(null);
      setError(null);
    } catch (err) {
      console.error('AuthProvider: Error signing out:', err);
      setError('An unexpected error occurred');
    }
  };

  const contextValue: AuthContextType = {
    user,
    session,
    loading,
    isConfigured,
    error,
    signOut,
    refreshSession,
  };

  if (!mounted) {
    return (
      <AuthContext.Provider value={{
        user: null,
        session: null,
        loading: false,
        isConfigured,
        error: null,
        signOut: async () => {},
        refreshSession: async () => {},
      }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={contextValue}>
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
