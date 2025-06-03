import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
// Import Supabase types for session and user
import { Session, User } from '@supabase/supabase-js';
// Import configured Supabase client
import { supabase } from '../lib/supabase';

// Define the shape of the UserContext
interface UserContextType {
  user: User | null;              // Currently authenticated user or null
  session: Session | null;        // Current auth session or null
  loading: boolean;               // Loading state while fetching user/session
  refreshUser: () => Promise<void>; // Function to manually refresh user data
}

// Create the context with default values
const UserContext = createContext<UserContextType>({
  user: null,
  session: null,
  loading: true,
  refreshUser: async () => {},
});

// Custom hook to access UserContext values
export const useUser = () => useContext(UserContext);

// Context provider component to wrap the app and provide user data
export const UserProvider = ({ children }: { children: ReactNode }) => {
  // State to store user info
  const [user, setUser] = useState<User | null>(null);
  // State to store session info
  const [session, setSession] = useState<Session | null>(null);
  // Loading indicator for fetching user/session
  const [loading, setLoading] = useState(true);

  // Function to fetch current user and session from Supabase
  const fetchUser = async () => {
    // Get current session from Supabase auth
    const session = supabase.auth.session();

    // If no session, clear user and session state
    if (!session) {
      setUser(null);
      setSession(null);
    } else {
      // Otherwise set user and session from current session
      setUser(session.user ?? null);
      setSession(session ?? null);
    }
    // Done loading after fetching
    setLoading(false);
  };

  // Effect to fetch user on mount and listen for auth state changes
  useEffect(() => {
    fetchUser();

    // Subscribe to auth state changes to update user and session automatically
    const subscription = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
      setSession(session ?? null);
    });

    // Cleanup subscription on unmount
    return () => {
      subscription.data?.unsubscribe();
    };
  }, []);

  // Prepare the context value to be provided
  const value: UserContextType = {
    user,
    session,
    loading,
    refreshUser: fetchUser,
  };

  // Render the provider with children inside
  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
};
