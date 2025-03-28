
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
};

interface AuthContextType {
  user: UserWithRole | null;
  isLoading: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
  register: (email: string, password: string, role: 'teacher' | 'student', name: string) => void;
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
            // Get user metadata for role and name
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('role, name')
              .eq('id', session.user.id)
              .single();
              
            if (profile) {
              const userWithRole: UserWithRole = {
                id: session.user.id,
                email: session.user.email || '',
                role: profile.role as 'teacher' | 'student',
                name: profile.name
              };
              setUser(userWithRole);
            } else {
              // Fallback for demo purposes
              const email = session.user.email || '';
              const isTeacher = email.includes('teacher');
              
              const userWithRole: UserWithRole = {
                id: session.user.id,
                email: email,
                role: isTeacher ? 'teacher' : 'student',
                name: isTeacher ? 'Teacher User' : 'Student User'
              };
              setUser(userWithRole);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
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
            // Get user metadata for role and name
            const { data: profile } = await supabase
              .from('user_profiles')
              .select('role, name')
              .eq('id', session.user.id)
              .single();
              
            if (profile) {
              const userWithRole: UserWithRole = {
                id: session.user.id,
                email: session.user.email || '',
                role: profile.role as 'teacher' | 'student',
                name: profile.name
              };
              setUser(userWithRole);
            } else {
              // Fallback for demo purposes if profile doesn't exist
              const email = session.user.email || '';
              const isTeacher = email.includes('teacher');
              
              const userWithRole: UserWithRole = {
                id: session.user.id,
                email: email,
                role: isTeacher ? 'teacher' : 'student',
                name: isTeacher ? 'Teacher User' : 'Student User'
              };
              setUser(userWithRole);
            }
          } catch (error) {
            console.error('Error fetching user profile:', error);
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

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password
      });
      
      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        // Check if this is a teacher or student email for demo
        const isTeacher = email.includes('teacher');
        
        if (isTeacher) {
          navigate('/dashboard');
        } else {
          navigate('/student');
        }
        
        toast.success(`Welcome back!`);
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during login");
    } finally {
      setIsLoading(false);
    }
  };

  const register = async (email: string, password: string, role: 'teacher' | 'student', name: string) => {
    setIsLoading(true);
    
    try {
      // Sign up the user
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            role,
            name
          }
        }
      });
      
      if (error) {
        toast.error(error.message);
      } else if (data.user) {
        // Insert into user_profiles table
        const { error: profileError } = await supabase
          .from('user_profiles')
          .insert({
            id: data.user.id,
            role,
            name
          });
          
        if (profileError) {
          console.error('Error creating user profile:', profileError);
        }
        
        // Redirect based on role
        if (role === 'teacher') {
          navigate('/dashboard');
        } else {
          navigate('/student');
        }
        
        toast.success("Account created successfully!");
      }
    } catch (error: any) {
      toast.error(error.message || "An error occurred during registration");
    } finally {
      setIsLoading(false);
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

  return (
    <AuthContext.Provider value={{ user, isLoading, login, logout, register }}>
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
