import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { ArrowLeft, ArrowRight } from 'lucide-react';
import { LessonSlide } from '@/types/lesson';
import { 
  joinPresentationSession, 
  getLessonById,
  updateStudentSlide,
  submitAnswer
} from '@/services/lessonService';
import { useRealTimeSync } from '@/hooks/useRealTimeSync';
import { supabase } from '@/integrations/supabase/client';

interface StudentSession {
  presentationId: string | null;
  sessionId: string | null;
  currentSlide: number;
}

const StudentView: React.FC = () => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [session, setSession] = useState<StudentSession>({
    presentationId: null,
    sessionId: null,
    currentSlide: 0
  });
  const [slides, setSlides] = useState<LessonSlide[]>([]);
  const [loading, setLoading] = useState(false);
  
  const { 
    data: sessionData,
    loading: sessionLoading 
  } = useRealTimeSync(
    'presentation_sessions',
    'id',
    session.sessionId || '',
    null
  );
  
  useEffect(() => {
    if (sessionData && !sessionLoading && session.presentationId) {
      if (sessionData.is_synced && session.currentSlide !== sessionData.current_slide) {
        setSession(prev => ({
          ...prev,
          currentSlide: sessionData.current_slide
        }));
        
        if (user && session.sessionId) {
          updateStudentSlide(session.sessionId, user.id, sessionData.current_slide);
        }
      }
    }
  }, [sessionData, sessionLoading, session.currentSlide, session.presentationId, user, session.sessionId]);
  
  const handleJoinSession = async () => {
    if (!joinCode.trim() || !user) {
      toast.error('Please enter a valid join code');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await joinPresentationSession(joinCode.trim(), user.id);
      
      if (!result) {
        toast.error('Invalid join code or session not found');
        return;
      }
      
      const lesson = await getLessonById(result.presentationId);
      
      if (!lesson) {
        toast.error('Failed to load presentation');
        return;
      }
      
      setSlides(lesson.slides);
      
      const { data: sessionInfo } = await supabase
        .from('presentation_sessions')
        .select('current_slide')
        .eq('id', result.sessionId)
        .single();
      
      setSession({
        presentationId: result.presentationId,
        sessionId: result.sessionId,
        currentSlide: sessionInfo?.current_slide || 0
      });
      
      toast.success('Joined the presentation');
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreviousSlide = async () => {
    if (session.currentSlide > 0 && !sessionData?.is_synced) {
      const newIndex = session.currentSlide - 1;
      
      setSession(prev => ({
        ...prev,
        currentSlide: newIndex
      }));
      
      if (user && session.sessionId) {
        await updateStudentSlide(session.sessionId, user.id, newIndex);
      }
    }
  };
  
  const handleNextSlide = async () => {
    if (session.currentSlide < slides.length - 1 && !sessionData?.is_synced) {
      const newIndex = session.currentSlide + 1;
      
      setSession(prev => ({
        ...prev,
        currentSlide: newIndex
      }));
      
      if (user && session.sessionId) {
        await updateStudentSlide(session.sessionId, user.id, newIndex);
      }
    }
  };
  
  const handleResponseSubmit = async (blockId: string, response: string | boolean) => {
    if (!user || !session.sessionId || !slides[session.currentSlide]) return;
    
    try {
      const currentSlide = slides[session.currentSlide];
      
      const success = await submitAnswer(
        session.sessionId,
        currentSlide.id,
        blockId,
        user.id,
        response
      );
      
      if (success) {
        toast.success('Response submitted');
      } else {
        toast.error('Failed to submit response');
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error('Error submitting response');
    }
  };
  
  if (!user) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <p>Please log in to join a presentation</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!session.presentationId || !session.sessionId) {
    return (
      <div className="container max-w-md py-12">
        <Card>
          <CardHeader>
            <CardTitle>Join a Presentation</CardTitle>
            <CardDescription>Enter the join code provided by your teacher</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Input
                placeholder="Enter join code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value)}
              />
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              className="w-full" 
              onClick={handleJoinSession}
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Presentation'}
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const currentSlide = slides[session.currentSlide];
  const syncEnabled = sessionData?.is_synced ?? true;
  
  if (!currentSlide) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="pt-6">
            <p>Slide not found</p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container py-4">
      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{currentSlide.title}</h2>
                <div className="text-sm text-muted-foreground">
                  Slide {session.currentSlide + 1} of {slides.length}
                </div>
              </div>
              
              <LessonSlideView 
                slide={currentSlide} 
                isStudentView={true}
                studentId={user.id}
                onResponseSubmit={handleResponseSubmit}
              />
              
              <div className="flex justify-between mt-6">
                <Button 
                  onClick={handlePreviousSlide} 
                  disabled={session.currentSlide === 0 || syncEnabled}
                  className="flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button 
                  onClick={handleNextSlide} 
                  disabled={session.currentSlide === slides.length - 1 || syncEnabled}
                  className="flex items-center"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              {syncEnabled && (
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Navigation controlled by teacher
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentView;
