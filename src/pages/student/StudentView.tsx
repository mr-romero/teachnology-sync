import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/context/AuthContext';
import { toast } from '@/components/ui/sonner';
import { LessonSlide } from '@/types/lesson';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { ArrowRight, ArrowLeft, Pause } from 'lucide-react';
import { LockIcon } from 'lucide-react';
import { 
  joinPresentationSession,
  getLessonById,
  updateStudentSlide,
  submitAnswer
} from '@/services/lessonService';
import { useRealTimeSync } from '@/hooks/useRealTimeSync';
import { supabase } from '@/integrations/supabase/client';

// Update interface to include paced_slides property
interface PresentationSession {
  id: string;
  join_code: string;
  current_slide: number;
  is_synced: boolean;
  active_students: number;
  is_paused: boolean;
  paced_slides?: number[]; // Add this to match the teacher's interface
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
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [allowedSlides, setAllowedSlides] = useState<number[]>([]);
  
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
    if (sessionData && !sessionLoading) {
      // First, update current slide based on sync mode
      if (sessionData.is_synced) {
        setCurrentSlideIndex(sessionData.current_slide);
        
        // When in sync mode, paced slides don't matter
        // because the teacher controls everything
        setAllowedSlides([]);
      } else {
        // When not in sync mode, check if we have paced slides
        if (sessionData.paced_slides && sessionData.paced_slides.length > 0) {
          console.log("Received paced slides from server:", sessionData.paced_slides);
          setAllowedSlides(sessionData.paced_slides);
          
          // If current slide is not in allowed slides, navigate to the closest allowed slide
          if (!sessionData.paced_slides.includes(sessionData.current_slide)) {
            // Find closest allowed slide
            const nextSlides = sessionData.paced_slides.filter(index => index >= sessionData.current_slide);
            const prevSlides = sessionData.paced_slides.filter(index => index < sessionData.current_slide);
            
            let targetSlide = sessionData.current_slide;
            if (nextSlides.length > 0) {
              targetSlide = nextSlides[0]; // First slide ahead
            } else if (prevSlides.length > 0) {
              targetSlide = prevSlides[prevSlides.length - 1]; // Last slide behind
            } else if (sessionData.paced_slides.length > 0) {
              targetSlide = sessionData.paced_slides[0]; // First allowed slide
            }
            
            console.log("Navigating to allowed slide:", targetSlide);
            setCurrentSlideIndex(targetSlide);
            if (user) {
              updateStudentSlide(sessionId, user.id, targetSlide);
            }
          } else {
            // Current slide is allowed, just update to the teacher's position
            setCurrentSlideIndex(sessionData.current_slide);
          }
        } else {
          // No paced slides, free navigation
          setAllowedSlides([]);
          // Still follow the teacher's initial slide position
          setCurrentSlideIndex(sessionData.current_slide);
        }
      }
      
      // Update the local isPaused state based on the database value
      if (sessionData.is_paused !== undefined) {
        setIsPaused(!!sessionData.is_paused);
      }
    }
  }, [sessionData, sessionLoading, sessionId, user]);

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
      let newIndex = currentSlideIndex - 1;
      
      // If there are paced slides (allowed slides), find the previous allowed slide
      if (allowedSlides.length > 0) {
        // Find the index of the current slide in allowedSlides array
        const currentAllowedIndex = allowedSlides.indexOf(currentSlideIndex);
        
        if (currentAllowedIndex > 0) {
          // Get the previous slide in the allowed slides array
          newIndex = allowedSlides[currentAllowedIndex - 1];
        } else if (currentAllowedIndex === -1) {
          // Current slide is not in allowed slides, find the closest previous allowed slide
          const previousAllowedSlides = allowedSlides.filter(index => index < currentSlideIndex);
          if (previousAllowedSlides.length > 0) {
            newIndex = Math.max(...previousAllowedSlides);
          } else {
            // No previous allowed slides, stay on current slide
            return;
          }
        } else {
          // Already at the first allowed slide, can't go back
          return;
        }
        
        // Extra verification to ensure we only navigate to allowed slides
        if (!allowedSlides.includes(newIndex)) {
          console.warn("Attempted to navigate to non-allowed slide:", newIndex);
          return;
        }
      }
      
      console.log("Navigating to previous slide:", newIndex);
      setCurrentSlideIndex(newIndex);
      
      if (user && sessionId) {
        await updateStudentSlide(sessionId, user.id, newIndex);
      }
    }
  };
  
  const handleNextSlide = async () => {
    if (lesson && currentSlideIndex < lesson.slides.length - 1) {
      let newIndex = currentSlideIndex + 1;
      
      // If there are paced slides (allowed slides), find the next allowed slide
      if (allowedSlides.length > 0) {
        // Find the index of the current slide in allowedSlides array
        const currentAllowedIndex = allowedSlides.indexOf(currentSlideIndex);
        
        if (currentAllowedIndex !== -1 && currentAllowedIndex < allowedSlides.length - 1) {
          // Get the next slide in the allowed slides array
          newIndex = allowedSlides[currentAllowedIndex + 1];
        } else if (currentAllowedIndex === -1) {
          // Current slide is not in allowed slides, find the closest next allowed slide
          const nextAllowedSlides = allowedSlides.filter(index => index > currentSlideIndex);
          if (nextAllowedSlides.length > 0) {
            newIndex = Math.min(...nextAllowedSlides);
          } else {
            // No next allowed slides, stay on current slide
            return;
          }
        } else {
          // Already at the last allowed slide, can't go forward
          return;
        }
        
        // Extra verification to ensure we only navigate to allowed slides
        if (!allowedSlides.includes(newIndex)) {
          console.warn("Attempted to navigate to non-allowed slide:", newIndex);
          return;
        }
      }
      
      console.log("Navigating to next slide:", newIndex);
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
    const isPacedMode = allowedSlides.length > 0;
    
    return (
      <div className="min-h-[calc(100vh-2rem)] flex flex-col">
        <div className="bg-background shadow-sm border-b p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold">{lesson.title}</h1>
            <div className="flex items-center space-x-4">
              {isSynced && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <LockIcon className="h-4 w-4 mr-1" />
                  <span>Teacher controlled</span>
                </div>
              )}
              <div className="text-sm font-medium bg-muted/20 px-3 py-1 rounded-md">
                Slide {currentSlideIndex + 1} of {lesson.slides.length}
              </div>
              <div className="text-sm">
                <span className="font-medium">Code: </span> 
                <span className="ml-1 bg-primary/10 text-primary font-mono px-2 py-1 rounded">{joinCode}</span>
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          <div className="container mx-auto">
            {/* Add paced slides info if enabled */}
            {isPacedMode && !isSynced && (
              <div className="mb-4 bg-blue-50 border border-blue-200 rounded-md p-2 text-blue-700 text-sm">
                <div className="flex items-center">
                  <span className="font-medium mr-2">Guided Navigation:</span>
                  <span>Teacher has limited navigation to specific slides</span>
                </div>
                <div className="text-xs mt-1">
                  Allowed slides: {allowedSlides.map(index => index + 1).join(', ')}
                </div>
              </div>
            )}
            
            <div className="mb-4">
              <h2 className="text-xl font-semibold">{currentSlide.title}</h2>
            </div>
            
            <div className="bg-white rounded-lg border p-6">
              <LessonSlideView 
                slide={currentSlide} 
                isStudentView={true}
                studentId={user?.id}
                onAnswerSubmit={handleSubmitAnswer}
                answeredBlocks={answeredBlocks}
                isPaused={isPaused}
              />
            </div>
          </div>
        </div>
        
        <div className="bg-background border-t p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Button 
              onClick={handlePreviousSlide} 
              disabled={
                currentSlideIndex === 0 || 
                isSynced || 
                (isPacedMode && allowedSlides.indexOf(currentSlideIndex) === 0)
              }
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {/* If in paced mode, show current position in sequence */}
            {isPacedMode && !isSynced && (
              <div className="text-xs bg-blue-50 text-blue-700 px-3 py-1 rounded-md flex items-center">
                {allowedSlides.indexOf(currentSlideIndex) !== -1 ? 
                  `${allowedSlides.indexOf(currentSlideIndex) + 1} of ${allowedSlides.length} selected slides` :
                  "Outside of selected slides"}
              </div>
            )}
            
            <Button 
              onClick={handleNextSlide} 
              disabled={
                currentSlideIndex === lesson.slides.length - 1 || 
                isSynced || 
                (isPacedMode && allowedSlides.indexOf(currentSlideIndex) === allowedSlides.length - 1)
              }
              className="flex items-center"
            >
              Next
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className={isJoined ? "h-screen overflow-hidden" : "container mx-auto px-4 py-8"}>
      {!isJoined ? renderJoinForm() : renderLessonView()}
    </div>
  );
};

export default StudentView;
