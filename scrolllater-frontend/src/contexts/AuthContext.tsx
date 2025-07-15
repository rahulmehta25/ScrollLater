'use client';

import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Session, AuthChangeEvent } from '@supabase/supabase-js';
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
      console.log('AuthProvider: Ensuring user profile for:', user.email);
      
      // Use upsert to create the profile if it doesn't exist
      const { error } = await supabase
        .from('user_profiles')
        .upsert({
          id: user.id,
          display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
          apple_shortcut_token: generateShortcutToken()
        }, { onConflict: 'id' });

      if (error) {
        console.error('AuthProvider: Error ensuring user profile:', error);
      } else {
        console.log('AuthProvider: User profile ensured successfully');
      }
    } catch (error) {
      console.error('AuthProvider: Error in ensureUserProfile:', error);
    }
  }, [supabase]);

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

    console.log('AuthProvider: Setting up auth state listener...');

    // Get initial session
    const getInitialSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('AuthProvider: Initial session fetch error:', error);
        } else {
          console.log('AuthProvider: Initial session:', {
            hasSession: !!session,
            userEmail: session?.user?.email
          });
          updateAuthState(session);
        }
      } catch (error) {
        console.error('AuthProvider: Error getting initial session:', error);
        setLoading(false);
      }
    };

    getInitialSession();

    // Set up auth state change listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event: AuthChangeEvent, session: Session | null) => {
        console.log('AuthProvider: Auth state changed:', {
          event,
          userEmail: session?.user?.email,
          hasSession: !!session
        });
        
        updateAuthState(session);

        if (event === 'SIGNED_IN' && session?.user) {
          console.log('AuthProvider: ✅ User signed in:', session.user.email);
        } else if (event === 'SIGNED_OUT') {
          console.log('AuthProvider: User signed out');
        } else if (event === 'TOKEN_REFRESHED') {
          console.log('AuthProvider: ✅ Token refreshed for:', session?.user?.email);
        }
      }
    );

    // Cleanup function
    return () => {
      console.log('AuthProvider: Cleaning up auth listener...');
      subscription.unsubscribe();
    };
  }, [supabase, mounted, updateAuthState]);

  const generateShortcutToken = () => {
    return 'sl_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const signOut = async () => {
    console.log('AuthProvider: Signing out...');
    await supabase.auth.signOut();
  };

  console.log('AuthProvider: Current state - loading:', loading, 'user:', user?.email, 'mounted:', mounted);

  // Prevent hydration mismatch by not rendering until mounted
  if (!mounted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-2 text-gray-600">Loading...</p>
        </div>
      </div>
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