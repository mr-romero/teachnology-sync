import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

const Register: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [className, setClassName] = useState('');
  const [role, setRole] = useState<'teacher' | 'student'>('student');
  const { register, loginWithGoogle, isLoading } = useAuth();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    register(email, password, role, name, role === 'student' ? className : undefined);
  };

  const handleGoogleLogin = () => {
    loginWithGoogle(role, role === 'student' ? className : undefined);
  };

  // Show/hide class field based on role
  const [showClassField, setShowClassField] = useState(role === 'student');
  
  useEffect(() => {
    setShowClassField(role === 'student');
  }, [role]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-teachsync-background px-4">
      <div className="w-full max-w-md">
        <Card className="border-none shadow-lg">
          <CardHeader className="space-y-1">
            <div className="flex justify-center mb-6">
              <div className="bg-primary text-white p-3 rounded-lg text-2xl font-bold">TS</div>
            </div>
            <CardTitle className="text-2xl text-center font-bold">Create an Account</CardTitle>
            <CardDescription className="text-center">
              Enter your information to get started
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Google Sign Up Button */}
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
                      Adding your class helps teachers identify you
                    </p>
                  </div>
                )}
                
                <Button 
                  type="button" 
                  className="w-full flex items-center justify-center gap-2" 
                  variant="outline"
                  disabled={isLoading || (showClassField && !className.trim())}
                  onClick={handleGoogleLogin}
                >
                  <svg width="20" height="20" viewBox="0 0 48 48">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                  </svg>
                  Sign up with Google
                </Button>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <Separator />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-background px-2 text-muted-foreground">Or continue with</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Input
                    id="name"
                    placeholder="Full Name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    id="email"
                    placeholder="Email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Input
                    id="password"
                    placeholder="Password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>I am a:</Label>
                  <RadioGroup 
                    value={role} 
                    onValueChange={(value) => setRole(value as 'teacher' | 'student')}
                    className="flex space-x-4"
                  >
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="teacher" id="teacher" />
                      <Label htmlFor="teacher">Teacher</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="student" id="student" />
                      <Label htmlFor="student">Student</Label>
                    </div>
                  </RadioGroup>
                </div>
                
                {showClassField && (
                  <div className="space-y-2">
                    <Label htmlFor="class-input">Your Class:</Label>
                    <Input
                      id="class-input"
                      placeholder="Enter your class (e.g., Math 101)"
                      value={className}
                      onChange={(e) => setClassName(e.target.value)}
                      required={role === 'student'}
                    />
                  </div>
                )}
                
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={isLoading}
                >
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link to="/login" className="text-primary font-medium hover:underline">
                Sign in
              </Link>
            </p>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
};

export default Register;
