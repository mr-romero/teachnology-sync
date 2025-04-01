import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { joinPresentationSession, getLessonById } from '@/services/lessonService';
import { Loader2, ArrowRight } from 'lucide-react';

const JoinSession: React.FC = () => {
  const [searchParams] = useSearchParams();
  const joinCode = searchParams.get('code') || '';
  const [loading, setLoading] = useState(false);
  const [isJoining, setIsJoining] = useState(false);
  const { user, isLoading, loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  
  // Try to auto-join with code from URL parameters
  useEffect(() => {
    if (joinCode && user && !isLoading && !loading) {
      handleJoinSession(joinCode);
    }
  }, [joinCode, user, isLoading]);
  
  // Handle login if no user
  useEffect(() => {
    if (!user && !isLoading && joinCode) {
      // Store the join code in session storage before redirecting to login
      sessionStorage.setItem('pendingJoinCode', joinCode);
      // Show a message that we're redirecting to login
      toast.info('Please sign in with Google to join the session');
      // Redirect to login after a short delay
      const timer = setTimeout(() => {
        loginWithGoogle('student');
      }, 1500);
      
      return () => clearTimeout(timer);
    }
    
    // Check if we're returning from auth with a pending join code
    if (user && !isLoading) {
      const pendingCode = sessionStorage.getItem('pendingJoinCode');
      if (pendingCode) {
        sessionStorage.removeItem('pendingJoinCode');
        handleJoinSession(pendingCode);
      }
    }
  }, [user, isLoading, loginWithGoogle]);
  
  const handleJoinSession = async (code: string) => {
    if (!user) {
      toast.error('You must be logged in to join a session');
      return;
    }
    
    setIsJoining(true);
    setLoading(true);
    
    try {
      const result = await joinPresentationSession(code, user.id);
      
      if (!result) {
        toast.error('Failed to join session. Invalid code or session has ended.');
        setLoading(false);
        setIsJoining(false);
        return;
      }
      
      const lessonData = await getLessonById(result.presentationId);
      
      if (!lessonData) {
        toast.error('Failed to load lesson data');
        setLoading(false);
        setIsJoining(false);
        return;
      }
      
      toast.success('Successfully joined the session!');
      
      // Navigate to the student view with the session details
      navigate(`/student/session/${result.sessionId}`, { 
        state: { 
          autoJoin: true,
          sessionId: result.sessionId,
          presentationId: result.presentationId,
          joinCode: code
        } 
      });
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('An error occurred while joining the session');
      setIsJoining(false);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-muted/10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-xl">Join Lesson Session</CardTitle>
          <CardDescription>
            {joinCode 
              ? 'Joining session with the provided code...' 
              : 'Enter the session code provided by your teacher'}
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2">Loading...</span>
            </div>
          ) : isJoining ? (
            <div className="flex flex-col items-center justify-center py-8 space-y-4">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <div className="text-center">
                <p className="font-medium">Joining session...</p>
                <p className="text-sm text-muted-foreground">Please wait while we connect you to the lesson</p>
              </div>
            </div>
          ) : !user ? (
            <div className="flex flex-col items-center justify-center py-4 space-y-4">
              <p className="text-center text-muted-foreground">
                You need to sign in with your Google account to join this session
              </p>
              <Button onClick={() => loginWithGoogle('student')}>
                Sign in with Google
              </Button>
            </div>
          ) : !joinCode ? (
            <div className="flex space-x-2">
              <Input 
                placeholder="Enter join code" 
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
                className="flex-1"
              />
              <Button 
                onClick={() => handleJoinSession(joinCode)}
                disabled={!joinCode.trim()}
              >
                Join <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          ) : null}
        </CardContent>
        
        <CardFooter className="flex justify-between border-t pt-4">
          <Button 
            variant="outline" 
            onClick={() => navigate('/student')}
          >
            Back to Dashboard
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
};

export default JoinSession;