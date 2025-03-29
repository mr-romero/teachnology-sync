import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { LessonSlide } from '@/types/lesson';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { ArrowRight, ArrowLeft } from 'lucide-react';
import { LockIcon } from 'lucide-react';
import { 
  joinPresentationSession,
  getLessonById,
  updateStudentSlide,
  submitAnswer
} from '@/services/lessonService';
import { useRealTimeSync } from '@/hooks/useRealTimeSync';
import { supabase } from '@/integrations/supabase/client';

interface PresentationSession {
  id: string;
  join_code: string;
  current_slide: number;
  is_synced: boolean;
  active_students: number;
}

const StudentView: React.FC = () => {
  const { user } = useAuth();
  const [joinCode, setJoinCode] = useState<string>('');
  const [sessionId, setSessionId] = useState<string>('');
  const [presentationId, setPresentationId] = useState<string>('');
  const [lesson, setLesson] = useState<{ title: string; slides: LessonSlide[] } | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [isJoined, setIsJoined] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [answeredBlocks, setAnsweredBlocks] = useState<string[]>([]);
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  
  const { 
    data: sessionData,
    loading: sessionLoading
  } = useRealTimeSync<PresentationSession>(
    'presentation_sessions',
    'id',
    sessionId,
    null
  );
  
  useEffect(() => {
    if (sessionData && sessionData.is_synced && !sessionLoading) {
      setCurrentSlideIndex(sessionData.current_slide);
      if (user && sessionId) {
        updateStudentSlide(sessionId, user.id, sessionData.current_slide);
      }
    }
  }, [sessionData, sessionLoading, user, sessionId]);
  
  useEffect(() => {
    const checkActiveSession = async () => {
      if (!user) return;
      
      try {
        const { data, error } = await supabase
          .from('session_participants')
          .select(`
            session_id,
            current_slide,
            presentation_sessions(
              id,
              join_code,
              presentation_id,
              is_synced,
              ended_at
            )
          `)
          .eq('user_id', user.id)
          .is('presentation_sessions.ended_at', null)
          .order('joined_at', { ascending: false })
          .limit(1);
          
        if (error) {
          console.error('Error checking active sessions:', error);
          return;
        }
        
        if (data && data.length > 0 && data[0].presentation_sessions) {
          const sessionInfo = data[0].presentation_sessions;
          setHasActiveSession(true);
          toast.info(
            `You have an active session with code: ${sessionInfo.join_code}. 
             Click "Continue" to rejoin or "Start New" to join a different session.`,
            {
              duration: 10000,
              action: {
                label: "Continue",
                onClick: () => rejoinSession(sessionInfo, data[0])
              }
            }
          );
        }
      } catch (error) {
        console.error('Error in checkActiveSession:', error);
      }
    };
    
    const rejoinSession = async (sessionInfo: any, participantData: any) => {
      setSessionId(sessionInfo.id);
      setJoinCode(sessionInfo.join_code);
      setPresentationId(sessionInfo.presentation_id);
      setCurrentSlideIndex(participantData.current_slide);
      
      const lessonData = await getLessonById(sessionInfo.presentation_id);
      if (lessonData) {
        setLesson(lessonData);
        setIsJoined(true);
        toast.success('Reconnected to active session');
      }
    };
    
    checkActiveSession();
  }, [user]);
  
  useEffect(() => {
    const getAnsweredBlocks = async () => {
      if (!sessionId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('student_answers')
          .select('content_id')
          .eq('session_id', sessionId)
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Error fetching answered blocks:', error);
          return;
        }
        
        if (data) {
          setAnsweredBlocks(data.map(item => item.content_id));
        }
      } catch (error) {
        console.error('Error in getAnsweredBlocks:', error);
      }
    };
    
    getAnsweredBlocks();
  }, [sessionId, user]);
  
  const handleJoinSession = async () => {
    if (!joinCode.trim() || !user) {
      toast.error('Please enter a valid join code');
      return;
    }
    
    setLoading(true);
    
    try {
      const result = await joinPresentationSession(joinCode.trim(), user.id);
      
      if (!result) {
        toast.error('Failed to join session. Invalid code or session has ended.');
        setLoading(false);
        return;
      }
      
      setSessionId(result.sessionId);
      setPresentationId(result.presentationId);
      
      const lessonData = await getLessonById(result.presentationId);
      
      if (!lessonData) {
        toast.error('Failed to load lesson data');
        setLoading(false);
        return;
      }
      
      setLesson(lessonData);
      setIsJoined(true);
      toast.success('Successfully joined the lesson');
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('An error occurred while joining the session');
    } finally {
      setLoading(false);
    }
  };

  const handleStartNew = () => {
    setHasActiveSession(false);
    setIsJoined(false);
    setJoinCode('');
    setSessionId('');
    setPresentationId('');
    setLesson(null);
  };
  
  const handlePreviousSlide = async () => {
    if (currentSlideIndex > 0 && lesson) {
      const newIndex = currentSlideIndex - 1;
      setCurrentSlideIndex(newIndex);
      
      if (user && sessionId) {
        await updateStudentSlide(sessionId, user.id, newIndex);
      }
    }
  };
  
  const handleNextSlide = async () => {
    if (lesson && currentSlideIndex < lesson.slides.length - 1) {
      const newIndex = currentSlideIndex + 1;
      setCurrentSlideIndex(newIndex);
      
      if (user && sessionId) {
        await updateStudentSlide(sessionId, user.id, newIndex);
      }
    }
  };
  
  const handleSubmitAnswer = async (blockId: string, answer: string | number | boolean) => {
    if (!user || !sessionId || !lesson) return;
    
    try {
      const currentSlide = lesson.slides[currentSlideIndex];
      
      const success = await submitAnswer(
        sessionId,
        currentSlide.id,
        blockId,
        user.id,
        answer
      );
      
      if (success) {
        setAnsweredBlocks(prev => [...prev, blockId]);
        toast.success('Answer submitted');
      } else {
        toast.error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('An error occurred while submitting your answer');
    }
  };
  
  const renderJoinForm = () => (
    <div className="flex flex-col items-center justify-center min-h-[70vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-6">
          <h1 className="text-2xl font-bold text-center mb-6">Join a Lesson</h1>
          <div className="space-y-4">
            <div>
              <label htmlFor="join-code" className="block text-sm font-medium mb-1">
                Enter Join Code
              </label>
              <Input
                id="join-code"
                placeholder="Enter 6-character code"
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                className="text-center text-lg uppercase"
                maxLength={6}
              />
            </div>
            <Button 
              onClick={handleJoinSession} 
              className="w-full"
              disabled={loading}
            >
              {loading ? 'Joining...' : 'Join Lesson'}
            </Button>
            
            {hasActiveSession && (
              <Button 
                variant="outline" 
                onClick={handleStartNew}
                className="w-full mt-2"
              >
                Join Different Session
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
  
  const renderLessonView = () => {
    if (!lesson) return null;
    
    const currentSlide = lesson.slides[currentSlideIndex];
    const isSynced = sessionData?.is_synced ?? false;
    
    return (
      <div className="container max-w-4xl mx-auto py-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-xl font-semibold">{lesson.title}</h1>
              <div className="flex items-center space-x-2">
                {isSynced && (
                  <div className="flex items-center text-sm text-muted-foreground">
                    <LockIcon className="h-4 w-4 mr-1" />
                    <span>Teacher controlled</span>
                  </div>
                )}
                <div className="text-sm text-muted-foreground">
                  Slide {currentSlideIndex + 1} of {lesson.slides.length}
                </div>
              </div>
            </div>
            
            <LessonSlideView 
              slide={currentSlide} 
              isStudentView={true}
              studentId={user?.id}
              onAnswerSubmit={handleSubmitAnswer}
              answeredBlocks={answeredBlocks}
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
                disabled={currentSlideIndex === lesson.slides.length - 1 || isSynced}
                className="flex items-center"
              >
                Next
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };
  
  return (
    <div className="container mx-auto px-4 py-8">
      {!isJoined ? renderJoinForm() : renderLessonView()}
    </div>
  );
};

export default StudentView;
