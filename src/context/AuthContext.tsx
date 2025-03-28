
import React, { createContext, useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from "@/components/ui/sonner";

// For real implementation with Supabase, we'll replace this with actual Supabase auth
type User = {
  id: string;
  email: string;
  role: 'teacher' | 'student';
  name: string;
};

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => void;
  logout: () => void;
  register: (email: string, password: string, role: 'teacher' | 'student', name: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Mock users for demo purposes, to be replaced with Supabase auth
const mockUsers: User[] = [
  { id: '1', email: 'teacher@example.com', role: 'teacher', name: 'Ms. Johnson' },
  { id: '2', email: 'student@example.com', role: 'student', name: 'Alex Student' },
];

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Check if user exists in local storage (mimicking session persistence)
    const storedUser = localStorage.getItem('teachsync_user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setIsLoading(false);
  }, []);

  const login = (email: string, password: string) => {
    setIsLoading(true);
    
    // Simulate authentication delay
    setTimeout(() => {
      const foundUser = mockUsers.find(u => u.email === email);
      
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('teachsync_user', JSON.stringify(foundUser));
        
        // Redirect based on role
        if (foundUser.role === 'teacher') {
          navigate('/dashboard');
        } else {
          navigate('/student');
        }
        
        toast.success(`Welcome back, ${foundUser.name}!`);
      } else {
        toast.error("Invalid credentials. Try 'teacher@example.com' or 'student@example.com'");
      }
      
      setIsLoading(false);
    }, 1000);
  };

  const register = (email: string, password: string, role: 'teacher' | 'student', name: string) => {
    setIsLoading(true);
    
    // Simulate registration delay
    setTimeout(() => {
      const newUser: User = {
        id: `${mockUsers.length + 1}`,
        email,
        role,
        name
      };
      
      // Add to mock users (in a real app, this would be a DB operation)
      mockUsers.push(newUser);
      
      // Auto-login after registration
      setUser(newUser);
      localStorage.setItem('teachsync_user', JSON.stringify(newUser));
      
      // Redirect based on role
      if (role === 'teacher') {
        navigate('/dashboard');
      } else {
        navigate('/student');
      }
      
      toast.success("Account created successfully!");
      setIsLoading(false);
    }, 1000);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('teachsync_user');
    navigate('/');
    toast.success("Logged out successfully");
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
