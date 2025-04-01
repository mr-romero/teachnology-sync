import React, { useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { Input } from '@/components/ui/input';

const Login: React.FC = () => {
  const [className, setClassName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const { user, loginWithGoogle, isLoading } = useAuth();
  
  // Show/hide class field based on role
  const showClassField = role === 'student';
  
  // If user is already logged in, redirect to dashboard or student page
  if (user) {
    if (user.role === 'teacher') {
      return <Navigate to="/dashboard" />;
    } else {
      return <Navigate to="/student" />;
    }
  }

  const handleGoogleLogin = () => {
    loginWithGoogle(role, role === 'student' ? (className || null) : null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-teachsync-background px-4">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6">
              <div className="bg-primary text-white p-3 rounded-lg text-2xl font-bold">TS</div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">Welcome back</CardTitle>
            <CardDescription className="text-center">
              Sign in to your account
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Role Selection */}
              <div className="space-y-2">
                <div className="flex gap-2 mb-2">
                  <Button
                    type="button"
                    variant={role === 'student' ? 'default' : 'outline'}
                    className="w-1/2"
                    onClick={() => setRole('student')}
                  >
                    As Student
                  </Button>
                  <Button
                    type="button"
                    variant={role === 'teacher' ? 'default' : 'outline'}
                    className="w-1/2"
                    onClick={() => setRole('teacher')}
                  >
                    As Teacher
                  </Button>
                </div>
                
                {showClassField && (
                  <div className="mb-3">
                    <Input
                      id="className"
                      placeholder="Enter your class (e.g., Math 101, Physics A)"
                      type="text"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Adding your class helps teachers identify you (optional)
                    </p>
                  </div>
                )}
                
                {/* Google Sign In Button */}
                <Button 
                  type="button" 
                  className="w-full flex items-center justify-center gap-2" 
                  variant="outline"
                  disabled={isLoading}
                  onClick={handleGoogleLogin}
                >
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#FFC107" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C39.211 39.604 44 33.33 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                    <path fill="#FF3D00" d="m6.306 14.691 6.571 4.819C14.655 15.108 18.961 12 24 12c3.059 0 5.842 1.154 7.961 3.039l5.657-5.657C34.046 6.053 29.268 4 24 4 16.318 4 9.656 8.337 6.306 14.691z"/>
                    <path fill="#4CAF50" d="M24 44c5.166 0 9.86-1.977 13.409-5.192l-6.19-5.238A11.91 11.91 0 0 1 24 36c-5.202 0-9.619-3.317-11.283-7.946l-6.522 5.025C9.505 39.556 16.227 44 24 44z"/>
                    <path fill="#1976D2" d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.087 5.571l.003-.002 6.19 5.238C39.211 39.604 44 33.33 44 24c0-1.341-.138-2.65-.389-3.917z"/>
                  </svg>
                  Sign in with Google
                </Button>
                
                <div className="text-center text-sm text-muted-foreground mt-4">
                  New to TeachSync?{' '}
                  <Link to="/register" className="text-primary hover:underline">
                    Create an account
                  </Link>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Login;
