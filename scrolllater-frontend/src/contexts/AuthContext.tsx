'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
import { createSupabaseClient, isSupabaseConfigured } from '@/lib/supabase';

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

  // Prevent hydration mismatch
  useEffect(() => {
    setMounted(true);
  }, []);

  const ensureUserProfile = useCallback(async (currentUser: User) => {
    if (!currentUser || !isSupabaseConfigured()) return;

    try {
      const supabase = createSupabaseClient();
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: currentUser.id,
          display_name: currentUser.user_metadata?.full_name || currentUser.email?.split('@')[0] || 'User',
          apple_shortcut_token: 'sl_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15)
        }, { onConflict: 'id' });

      if (error) {
        console.error('AuthProvider: Error ensuring user profile:', error);
      }
    } catch (error) {
      console.error('AuthProvider: Error in ensureUserProfile:', error);
    }
  }, []);

  const updateAuthState = useCallback((newSession: Session | null) => {
    setUser(newSession?.user ?? null);
    setSession(newSession);
    setLoading(false);

    if (newSession?.user) {
      ensureUserProfile(newSession.user);
    }
  }, [ensureUserProfile]);

  useEffect(() => {
    if (!mounted) return;

    if (!isSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = createSupabaseClient();

    const getInitialSession = async () => {
      try {
        const { data: { session: initialSession }, error } = await supabase.auth.getSession();
        if (error) {
          console.error('AuthProvider: Initial session fetch error:', error);
        } else {
          updateAuthState(initialSession);
        }
      } catch (error) {
        console.error('AuthProvider: Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event: AuthChangeEvent, newSession: Session | null) => {
        updateAuthState(newSession);
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [mounted, updateAuthState]);

  const signOut = async () => {
    if (!isSupabaseConfigured()) return;
    const supabase = createSupabaseClient();
    await supabase.auth.signOut();
  };

  if (!mounted) {
    return (
      <AuthContext.Provider value={{ user: null, session: null, loading: false, signOut: async () => {} }}>
        {children}
      </AuthContext.Provider>
    );
  }

  return (
    <AuthContext.Provider value={{ user, session, loading, signOut }}>
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
