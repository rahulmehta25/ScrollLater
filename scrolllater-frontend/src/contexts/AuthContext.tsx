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

  const ensureUserProfile = useCallback(async () => {
    if (!user?.id) {
      console.log('ensureUserProfile: No user ID, skipping');
      return;
    }

    try {
      console.log('Ensuring user profile for:', user?.email);
      
      // Check if user profile exists
      const { data: existingProfile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .single();

      if (fetchError && fetchError.code === 'PGRST116') {
        // Profile doesn't exist, create it
        console.log('Creating new user profile for:', user.id);
        const { error: insertError } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            display_name: user.user_metadata?.full_name || user.email?.split('@')[0] || 'User',
            apple_shortcut_token: generateShortcutToken()
          });

        if (insertError) {
          console.error('Error creating user profile:', insertError);
        } else {
          console.log('User profile created successfully');
        }
      } else if (fetchError) {
        console.error('Error checking user profile:', fetchError);
      } else {
        console.log('User profile already exists');
      }
    } catch (error) {
      console.error('Error ensuring user profile:', error);
    }
  }, [user, supabase]);

  useEffect(() => {
    if (user && mounted) {
      ensureUserProfile();
    }
  }, [user, ensureUserProfile, mounted]);

  useEffect(() => {
    if (!mounted) return;

    console.log('AuthProvider: Setting up auth state listener...');
    
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('AuthProvider: Auth state changed:', event, session?.user?.email);
        setUser(session?.user ?? null);
        setSession(session);
        setLoading(false);
      }
    );

    // Also check current session immediately
    const checkCurrentSession = async () => {
      try {
        console.log('AuthProvider: Checking current session...');
        const { data: { session: currentSession } } = await supabase.auth.getSession();
        console.log('AuthProvider: Current session:', currentSession?.user?.email);
        
        setUser(currentSession?.user ?? null);
        setSession(currentSession);
        setLoading(false);
      } catch (error) {
        console.error('AuthProvider: Error checking current session:', error);
        setLoading(false);
      }
    };
    
    checkCurrentSession();

    return () => subscription.unsubscribe();
  }, [supabase.auth, mounted]);

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