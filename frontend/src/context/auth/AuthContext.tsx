/**
 * Authentication Context
 * Manages Supabase auth state and user profile synchronization
 */
import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  type ReactNode,
} from 'react';
import type { User, Session, AuthError } from '@supabase/supabase-js';
import { supabase } from '../../lib/supabase';
import type { Database } from '../../types/supabase';

// Types
type UserProfile = Database['public']['Tables']['user_profiles']['Row'];
type DbUser = Database['public']['Tables']['users']['Row'];

export type AuthStatus = 
  | 'loading'      // Initial auth check in progress
  | 'authenticated' // User is signed in with valid session
  | 'unauthenticated' // No user signed in
  | 'guest';       // Guest mode (local-only, no auth)

export interface AuthState {
  // Core auth
  status: AuthStatus;
  user: User | null;           // Supabase Auth user
  session: Session | null;     // Current JWT session
  
  // Database user (public.users)
  dbUser: DbUser | null;
  
  // User profile (public.user_profiles)
  profile: UserProfile | null;
  
  // Loading states
  isLoading: boolean;
  isProfileLoading: boolean;
  
  // Error state
  error: AuthError | Error | null;
}

export interface AuthActions {
  // Auth methods
  signIn: (email: string, password: string) => Promise<{ error: AuthError | null }>;
  signUp: (email: string, password: string, metadata?: Record<string, unknown>) => Promise<{ error: AuthError | null; user: User | null }>;
  signOut: () => Promise<void>;
  
  // Guest mode
  enableGuestMode: () => void;
  disableGuestMode: () => void;
  
  // Profile management
  updateProfile: (updates: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<void>;
  
  // Password reset
  resetPassword: (email: string) => Promise<{ error: AuthError | null }>;
  updatePassword: (newPassword: string) => Promise<{ error: AuthError | null }>;
}

export type AuthContextValue = AuthState & AuthActions;

// Context
const AuthContext = createContext<AuthContextValue | null>(null);

// Hook
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

// Helper to safely get user ID
export function useAuthUserId(): string | null {
  const { user, dbUser, status } = useAuth();
  if (status === 'guest') return 'guest';
  return dbUser?.id ?? user?.id ?? null;
}

// Helper to check if user is authenticated
export function useIsAuthenticated(): boolean {
  const { status } = useAuth();
  return status === 'authenticated';
}

// Provider props
interface AuthProviderProps {
  children: ReactNode;
  allowGuest?: boolean;  // Allow guest mode fallback
}

export function AuthProvider({ children, allowGuest = true }: AuthProviderProps) {
  // Core state
  const [status, setStatus] = useState<AuthStatus>('loading');
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [dbUser, setDbUser] = useState<DbUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isProfileLoading, setIsProfileLoading] = useState(false);
  const [error, setError] = useState<AuthError | Error | null>(null);
  
  // Refs to prevent memory leaks and duplicate fetches
  const isMounted = useRef(true);
  const profileFetchInProgress = useRef(false);

  // Check for existing session on mount
  useEffect(() => {
    const checkSession = async () => {
      try {
        const { data, error: sessionError } = await supabase.auth.getSession();
        
        if (!isMounted.current) return;
        
        if (sessionError) {
          setError(sessionError);
          setStatus('unauthenticated');
          return;
        }

        if (data.session) {
          setSession(data.session);
          setUser(data.session.user);
          setStatus('authenticated');
          // Profile will be fetched by the user effect below
        } else {
          // Check for guest mode in localStorage
          const guestMode = localStorage.getItem('biofield_guest_mode') === 'true';
          if (guestMode && allowGuest) {
            setStatus('guest');
          } else {
            setStatus('unauthenticated');
          }
        }
      } catch (err) {
        if (!isMounted.current) return;
        setError(err instanceof Error ? err : new Error('Failed to check session'));
        setStatus('unauthenticated');
      }
    };

    checkSession();

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (!isMounted.current) return;

        switch (event) {
          case 'SIGNED_IN':
            setSession(newSession);
            setUser(newSession?.user ?? null);
            setStatus('authenticated');
            // Clear guest mode if active
            localStorage.removeItem('biofield_guest_mode');
            break;
            
          case 'SIGNED_OUT':
            setSession(null);
            setUser(null);
            setDbUser(null);
            setProfile(null);
            setStatus('unauthenticated');
            break;
            
          case 'USER_UPDATED':
            setUser(newSession?.user ?? null);
            break;
            
          case 'TOKEN_REFRESHED':
            setSession(newSession);
            break;
        }
      }
    );

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [allowGuest]);

  // Fetch database user and profile when auth user changes
  useEffect(() => {
    const fetchUserData = async () => {
      if (!user?.id || profileFetchInProgress.current) return;
      
      profileFetchInProgress.current = true;
      setIsProfileLoading(true);
      
      try {
        // Fetch or create public.users entry
        const { data: existingUser, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (!isMounted.current) return;

        let dbUserData: DbUser;

        if (userError || !existingUser) {
          // Create user entry if it doesn't exist
          const { data: newUser, error: createError } = await supabase
            .from('users')
            .insert({ id: user.id, email: user.email } as never)
            .select()
            .single();

          if (createError) throw createError;
          dbUserData = newUser as unknown as DbUser;
        } else {
          dbUserData = existingUser;
        }

        if (!isMounted.current) return;
        setDbUser(dbUserData);

        // Fetch or create user profile
        const { data: existingProfile, error: profileError } = await supabase
          .from('user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (!isMounted.current) return;

        if (profileError || !existingProfile) {
          // Create profile if it doesn't exist
          const { data: newProfile, error: createProfileError } = await supabase
            .from('user_profiles')
            .insert({ user_id: user.id, preferences: {} } as never)
            .select()
            .single();

          if (createProfileError) throw createProfileError;
          setProfile(newProfile as unknown as UserProfile);
        } else {
          setProfile(existingProfile);
        }
      } catch (err) {
        if (!isMounted.current) return;
        console.error('Failed to fetch user data:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch user data'));
      } finally {
        if (isMounted.current) {
          setIsProfileLoading(false);
          profileFetchInProgress.current = false;
        }
      }
    };

    if (status === 'authenticated' && user) {
      fetchUserData();
    }
  }, [user, status]);

  // Sign in
  const signIn = useCallback(async (email: string, password: string) => {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error);
    return { error };
  }, []);

  // Sign up
  const signUp = useCallback(async (email: string, password: string, metadata?: Record<string, unknown>) => {
    setError(null);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: metadata },
    });
    if (error) setError(error);
    return { error, user: data.user };
  }, []);

  // Sign out
  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    // State updates handled by auth state change listener
  }, []);

  // Enable guest mode
  const enableGuestMode = useCallback(() => {
    localStorage.setItem('biofield_guest_mode', 'true');
    setStatus('guest');
    setUser(null);
    setSession(null);
    setDbUser(null);
    setProfile(null);
  }, []);

  // Disable guest mode
  const disableGuestMode = useCallback(() => {
    localStorage.removeItem('biofield_guest_mode');
    setStatus('unauthenticated');
  }, []);

  // Refresh profile - defined before updateProfile to avoid hoisting issues
  const refreshProfile = useCallback(async () => {
    if (!user?.id) return;

    setIsProfileLoading(true);
    const { data, error } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (!error && data) {
      setProfile(data as unknown as UserProfile);
    }
    setIsProfileLoading(false);
  }, [user?.id]);

  // Update profile
  const updateProfile = useCallback(async (
    updates: Partial<Omit<UserProfile, 'id' | 'user_id' | 'created_at' | 'updated_at'>>
  ) => {
    if (!user?.id) return { error: new Error('No authenticated user') };

    const { error } = await supabase
      .from('user_profiles')
      .update({
        ...updates,
        updated_at: new Date().toISOString(),
      } as never)
      .eq('user_id', user.id);

    if (!error) {
      // Refresh profile after update
      await refreshProfile();
    }

    return { error };
  }, [user?.id, refreshProfile]);



  // Reset password
  const resetPassword = useCallback(async (email: string) => {
    setError(null);
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/auth/reset-password`,
    });
    if (error) setError(error);
    return { error };
  }, []);

  // Update password
  const updatePassword = useCallback(async (newPassword: string) => {
    setError(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) setError(error);
    return { error };
  }, []);

  const value: AuthContextValue = {
    // State
    status,
    user,
    session,
    dbUser,
    profile,
    isLoading: status === 'loading',
    isProfileLoading,
    error,
    // Actions
    signIn,
    signUp,
    signOut,
    enableGuestMode,
    disableGuestMode,
    updateProfile,
    refreshProfile,
    resetPassword,
    updatePassword,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export { AuthContext };
