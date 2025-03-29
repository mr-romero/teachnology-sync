
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { LessonSlide } from '@/types/lesson';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { ArrowRight, ArrowLeft, Lock } from 'lucide-react';
import { 
  joinPresentationSession,
  getLessonById,
  submitAnswer,
  updateStudentSlide
} from '@/services/lessonService';
import { useRealTimeSync } from '@/hooks/useRealTimeSync';

interface SessionData {
  id: string;
  current_slide: number;
  is_synced: boolean;
  presentation_id: string;
}

const StudentView: React.FC = () => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState('');
  const [sessionId, setSessionId] = useState('');
  const [presentationId, setPresentationId] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [slides, setSlides] = useState<LessonSlide[]>([]);
  const [isJoined, setIsJoined] = useState(false);
  const [loading, setLoading] = useState(false);
  
  const { 
    data: sessionData,
    loading: sessionLoading,
    error: sessionError
  } = useRealTimeSync<SessionData>(
    'presentation_sessions',
    'id',
    sessionId,
    null
  );
  
  useEffect(() => {
    if (sessionData && sessionData.is_synced) {
      if (currentSlideIndex !== sessionData.current_slide) {
        setCurrentSlideIndex(sessionData.current_slide);
        
        if (sessionId && user) {
          updateStudentSlide(sessionId, user.id, sessionData.current_slide)
            .catch(err => console.error('Error updating student slide:', err));
        }
      }
    }
  }, [sessionData, currentSlideIndex, sessionId, user]);
  
  const handleJoinSession = async () => {
    if (!joinCode || !user) return;
    
    setLoading(true);
    try {
      const response = await joinPresentationSession(joinCode, user.id);
      
      if (!response) {
        toast.error("Invalid join code or session not found");
        setLoading(false);
        return;
      }
      
      setSessionId(response.sessionId);
      setPresentationId(response.presentationId);
      
      const lesson = await getLessonById(response.presentationId);
      
      if (!lesson) {
        toast.error("Lesson not found. The teacher may have deleted it.");
        setLoading(false);
        setIsJoined(false);
        return;
      }
      
      setSlides(lesson.slides);
      setIsJoined(true);
      toast.success("Successfully joined session");
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error("Failed to join session");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePreviousSlide = async () => {
    if (currentSlideIndex > 0 && !sessionData?.is_synced) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      
      if (sessionId && user) {
        await updateStudentSlide(sessionId, user.id, newIndex);
      }
    }
  };
  
  const handleNextSlide = async () => {
    if (currentSlideIndex < slides.length - 1 && !sessionData?.is_synced) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      
      if (sessionId && user) {
        await updateStudentSlide(sessionId, user.id, newIndex);
      }
    }
  };
  
  const handleSubmitResponse = async (blockId: string, response: string | boolean) => {
    if (!sessionId || !user || !slides[currentSlideIndex]) return;
    
    try {
      const currentSlide = slides[currentSlideIndex];
      await submitAnswer(sessionId, currentSlide.id, blockId, user.id, response);
      toast.success("Response submitted");
    } catch (error) {
      console.error('Error submitting response:', error);
      toast.error("Failed to submit response");
    }
  };
  
  if (!isJoined) {
    return (
      <div className="container max-w-md mx-auto py-12">
        <Card>
          <CardContent className="pt-6">
            <h1 className="text-2xl font-bold mb-6 text-center">Join a Session</h1>
            <div className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="join-code" className="text-sm font-medium">
                  Enter the code provided by your teacher
                </label>
                <Input
                  id="join-code"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="Enter join code"
                  maxLength={6}
                  className="text-center text-lg"
                />
              </div>
              <Button 
                className="w-full"
                onClick={handleJoinSession}
                disabled={loading || !joinCode}
              >
                {loading ? "Joining..." : "Join Session"}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (sessionLoading || loading || slides.length === 0) {
    return (
      <div className="container py-12 flex justify-center">
        <p>Loading lesson...</p>
      </div>
    );
  }
  
  if (sessionError) {
    return (
      <div className="container py-12 flex justify-center">
        <div className="text-center">
          <p className="text-red-500 mb-4">Error loading session</p>
          <Button onClick={() => setIsJoined(false)}>Return to Join Screen</Button>
        </div>
      </div>
    );
  }
  
  const currentSlide = slides[currentSlideIndex];
  const isSynced = sessionData?.is_synced ?? false;
  
  if (!currentSlide) {
    return (
      <div className="container py-12 flex justify-center">
        <div className="text-center">
          <p className="text-amber-500 mb-4">Slide not found. The presentation may have been modified.</p>
          <Button onClick={() => setIsJoined(false)}>Return to Join Screen</Button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="container py-8">
      <div className="max-w-3xl mx-auto">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">{currentSlide.title}</h2>
              <div className="text-sm text-muted-foreground">
                Slide {currentSlideIndex + 1} of {slides.length}
              </div>
            </div>
            
            <LessonSlideView 
              slide={currentSlide} 
              isStudentView={true}
              studentId={user?.id}
              onResponseSubmit={handleSubmitResponse}
            />
            
            <div className="flex justify-between mt-6">
              <Button 
                onClick={handlePreviousSlide} 
                disabled={currentSlideIndex === 0 || isSynced}
                className="flex items-center"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Previous
              </Button>
              <Button 
                onClick={handleNextSlide} 
                disabled={currentSlideIndex === slides.length - 1 || isSynced}
                className="flex items-center"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
            
            {isSynced && (
              <div className="text-center mt-4 py-1 bg-green-100 dark:bg-green-900/30 rounded-md text-sm">
                <Lock className="h-4 w-4 inline-block mr-1" />
                The teacher is controlling navigation
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default StudentView;
