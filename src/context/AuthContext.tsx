import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/sonner";
import { supabase } from "@/integrations/supabase/client";
import { User } from '@supabase/supabase-js';

// Type for user with role
type UserWithRole = {
  id: string;
  email: string;
  role: 'teacher' | 'student';
  name: string;
  class?: string; // Add class field
  avatar_url?: string; // Add avatar URL for Google profile image
};

interface AuthContextType {
  user: UserWithRole | null;
  isLoading: boolean;
  logout: () => void;
  loginWithGoogle: (role: 'teacher' | 'student', className?: string) => void; // Google login only
  updateUserProfile: (updates: Partial<UserWithRole>) => Promise<boolean>;
  handleClassroomAuthError: (error: Error) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserWithRole | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  // Check for existing session and set up auth state listener
  useEffect(() => {
    // Set up auth state listener
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        setIsLoading(true);

        if (session?.user) {
          try {
            // First try to get role from profiles table (source of truth)
            const { data: profile } = await supabase
              .from('profiles')
              .select('role, full_name, class, avatar_url')
              .eq('id', session.user.id)
              .single();

            // Extract user metadata as fallback
            const userData = session.user.user_metadata;
            const role = (profile?.role || userData?.role || 'student') as 'teacher' | 'student';
            const name = profile?.full_name || userData?.name || userData?.full_name ||
              (role === 'teacher' ? 'Teacher User' : 'Student User');

            const userWithRole: UserWithRole = {
              id: session.user.id,
              email: session.user.email || '',
              role: role,
              name: name,
              class: profile?.class || userData?.class,
              avatar_url: profile?.avatar_url || userData?.avatar_url || userData?.picture
            };
            setUser(userWithRole);
          } catch (error) {
            console.error('Error processing user data:', error);
            setUser(null);
          }
        } else {
          setUser(null);
        }

        setIsLoading(false);
      }
    );

    // Check for existing session
    const checkUser = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (session?.user) {
          try {
            // First try to get role from profiles table (source of truth)
            const { data: profile } = await supabase
              .from('profiles')
              .select('role, full_name, class, avatar_url')
              .eq('id', session.user.id)
              .single();

            // Extract user metadata as fallback
            const userData = session.user.user_metadata;
            const role = (profile?.role || userData?.role || 'student') as 'teacher' | 'student';
            const name = profile?.full_name || userData?.name || userData?.full_name ||
              (role === 'teacher' ? 'Teacher User' : 'Student User');

            const userWithRole: UserWithRole = {
              id: session.user.id,
              email: session.user.email || '',
              role: role,
              name: name,
              class: profile?.class || userData?.class,
              avatar_url: profile?.avatar_url || userData?.avatar_url || userData?.picture
            };
            setUser(userWithRole);
          } catch (error) {
            console.error('Error processing user data:', error);
          }
        }

        setIsLoading(false);
      } catch (error) {
        console.error('Error checking user session:', error);
        setIsLoading(false);
      }
    };

    checkUser();

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Add Google login method
  const loginWithGoogle = async (role: 'teacher' | 'student', className?: string) => {
    setIsLoading(true);
    try {
      // Common options for both teachers and students
      const commonOptions = {
        redirectTo: `${window.location.origin}/auth/callback`,
        data: {
          role: role,
          class: className || null
        }
      };

      // Different scopes for teachers and students
      const queryParams = role === 'teacher'
        ? {
          access_type: 'offline',
          prompt: 'consent',
          // Adding auth.session parameter for longer-lived token (6 months)
          // Maximum allowed value is 180 days (6 months)
          authSessionLifetime: '15552000', // 180 days in seconds (6 months)
          scope: [
            'email',
            'profile',
            'https://www.googleapis.com/auth/classroom.courses.readonly',
            'https://www.googleapis.com/auth/classroom.rosters.readonly',
            'https://www.googleapis.com/auth/classroom.profile.emails',
            'https://www.googleapis.com/auth/classroom.profile.photos',
            'https://www.googleapis.com/auth/classroom.student-submissions.students.readonly',
            'https://www.googleapis.com/auth/classroom.coursework.students',
            'https://www.googleapis.com/auth/classroom.coursework.me',
            'https://www.googleapis.com/auth/classroom.announcements'
          ].join(' ')
        }
        : {
          access_type: 'online', // Don't need offline access for students
          prompt: 'select_account', // Allow students to select their account
          scope: 'email profile'
        };

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          queryParams,
          ...commonOptions
        }
      });

      if (error) {
        console.error("Google login error:", error);
        toast.error(error.message || "Failed to login with Google");
      }

      // No need to navigate here as the OAuth flow will redirect automatically
    } catch (error: any) {
      console.error("Google login exception:", error);
      toast.error(error.message || "An error occurred during Google login");
    } finally {
      setIsLoading(false);
    }
  };

  const updateUserProfile = async (updates: Partial<UserWithRole>): Promise<boolean> => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: updates
      });

      if (error) {
        toast.error(error.message);
        return false;
      }

      // Update local user state with the new values
      if (user) {
        setUser({ ...user, ...updates });
      }

      toast.success("Profile updated successfully");
      return true;
    } catch (error: any) {
      toast.error(error.message || "An error occurred updating your profile");
      return false;
    }
  };

  const logout = async () => {
    setIsLoading(true);

    try {
      const { error } = await supabase.auth.signOut();

      if (error) {
        toast.error(error.message);
      } else {
        setUser(null);
        navigate('/');
        toast.success("Logged out successfully");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during logout");
    } finally {
      setIsLoading(false);
    }
  };

  const handleClassroomAuthError = (error: Error) => {
    // Check for our custom auth error flag
    if ((error as any).isAuthError || error.message.includes("re-authenticate") || error.message.includes("provider token")) {
      console.log("Detected authentication error:", error.message);

      // Check if we've recently tried to re-authenticate to avoid infinite loops
      const lastAuthAttempt = localStorage.getItem('last_auth_attempt');
      const now = Date.now();

      if (lastAuthAttempt) {
        const timeSinceLastAttempt = now - parseInt(lastAuthAttempt);
        // Don't retry more than once every 5 minutes
        if (timeSinceLastAttempt < 5 * 60 * 1000) {
          console.log("Authentication attempt too recent, waiting before trying again");
          toast.error("Authentication error. Please try again in a few minutes.");
          return true;
        }
      }

      // Store current time as last authentication attempt
      localStorage.setItem('last_auth_attempt', now.toString());
      localStorage.setItem('auth_redirect_reason', 'token_expired');

      console.log("Re-authenticating with Google due to expired or missing token");
      toast.info("Your Google Classroom session has expired. Reconnecting...");
      loginWithGoogle('teacher');

      return true;
    }
    return false;
  };

  const value = {
    user,
    isLoading,
    logout,
    loginWithGoogle,
    updateUserProfile,
    handleClassroomAuthError
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
