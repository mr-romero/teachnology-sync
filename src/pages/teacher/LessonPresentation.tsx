
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowLeftCircle,
  Eye, 
  Users, 
  Lock, 
  Unlock, 
  Copy
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Lesson, LessonSlide, StudentProgress } from '@/types/lesson';
import { toast } from '@/components/ui/sonner';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import StudentResponseList from '@/components/lesson/StudentResponseList';
import { 
  getLessonById, 
  startPresentationSession, 
  getSessionParticipants,
  getSessionAnswers,
  updateSessionSlide,
  endPresentationSession
} from '@/services/lessonService';
import { useRealTimeSync, useRealTimeCollection } from '@/hooks/useRealTimeSync';
import { supabase } from '@/integrations/supabase/client';

interface PresentationSession {
  id: string;
  join_code: string;
  current_slide: number;
  is_synced: boolean;
  active_students: number;
}

interface SessionParticipant {
  id: string;
  user_id: string;
  current_slide: number;
  joined_at: string;
  last_active_at: string;
}

interface StudentAnswer {
  id: string;
  user_id: string;
  session_id: string;
  slide_id: string;
  content_id: string;
  answer: string;
  is_correct: boolean | null;
  submitted_at: string;
}

const LessonPresentation: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [studentView, setStudentView] = useState(false);
  const [sessionId, setSessionId] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>([]);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  
  const { 
    data: sessionData,
    loading: sessionLoading 
  } = useRealTimeSync<PresentationSession>(
    'presentation_sessions',
    'id',
    sessionId,
    null
  );
  
  const {
    data: participants,
    loading: participantsLoading,
    refresh: refreshParticipants
  } = useRealTimeCollection<SessionParticipant>(
    'session_participants',
    'session_id',
    sessionId,
    'joined_at'
  );
  
  const {
    data: answers,
    loading: answersLoading,
    refresh: refreshAnswers
  } = useRealTimeCollection<StudentAnswer>(
    'student_answers',
    'session_id',
    sessionId,
    'submitted_at'
  );
  
  // Check for existing active session on load
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!lessonId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('presentation_sessions')
          .select('id, join_code, current_slide')
          .eq('presentation_id', lessonId)
          .is('ended_at', null)
          .order('started_at', { ascending: false })
          .limit(1);
          
        if (error) {
          console.error('Error checking for existing session:', error);
          return;
        }
        
        if (data && data.length > 0) {
          setHasExistingSession(true);
          setSessionId(data[0].id);
          setJoinCode(data[0].join_code);
          setCurrentSlideIndex(data[0].current_slide);
          toast.success(`Reconnected to existing session with code: ${data[0].join_code}`);
        }
      } catch (error) {
        console.error('Error in checkExistingSession:', error);
      }
    };
    
    checkExistingSession();
  }, [lessonId, user]);
  
  useEffect(() => {
    const initLesson = async () => {
      if (!lessonId || !user) return;
      
      try {
        setLoading(true);
        
        const fetchedLesson = await getLessonById(lessonId);
        
        if (!fetchedLesson) {
          toast.error("Lesson not found");
          navigate('/dashboard');
          return;
        }
        
        setLesson(fetchedLesson);
        
        // Only start a new session if there isn't an existing one
        if (!hasExistingSession) {
          const code = await startPresentationSession(lessonId);
          
          if (code) {
            setJoinCode(code);
            toast.success(`Session started with join code: ${code}`);
            
            const { data } = await supabase
              .from('presentation_sessions')
              .select('id')
              .eq('join_code', code)
              .is('ended_at', null)
              .single();
              
            if (data) {
              setSessionId(data.id);
            }
          } else {
            toast.error("Failed to start presentation session");
          }
        }
      } catch (error) {
        console.error('Error initializing lesson presentation:', error);
        toast.error('An error occurred loading the presentation');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    initLesson();
  }, [lessonId, user, navigate, hasExistingSession]);
  
  useEffect(() => {
    if (sessionData && !sessionLoading) {
      setCurrentSlideIndex(sessionData.current_slide);
    }
  }, [sessionData, sessionLoading]);
  
  // Poll for participants periodically to ensure we have up-to-date data
  useEffect(() => {
    if (!sessionId) return;
    
    // Initial refresh
    refreshParticipants();
    refreshAnswers();
    
    // Set up polling every 5 seconds
    const pollingInterval = setInterval(() => {
      refreshParticipants();
      refreshAnswers();
    }, 5000);
    
    return () => clearInterval(pollingInterval);
  }, [sessionId, refreshParticipants, refreshAnswers]);
  
  useEffect(() => {
    if (!participants || !answers || participantsLoading || answersLoading) return;
    
    console.log("Processing participants:", participants);
    console.log("Processing answers:", answers);
    
    const progressData: StudentProgress[] = participants.map(participant => {
      const studentAnswers = answers.filter(answer => answer.user_id === participant.user_id);
      
      return {
        studentId: participant.user_id,
        studentName: `Student ${participant.user_id.substring(0, 5)}`,
        lessonId: lessonId || '',
        currentSlide: participant.current_slide.toString(),
        completedBlocks: studentAnswers.map(answer => answer.content_id),
        responses: studentAnswers.map(answer => ({
          studentId: answer.user_id,
          studentName: `Student ${answer.user_id.substring(0, 5)}`,
          lessonId: lessonId || '',
          slideId: answer.slide_id,
          blockId: answer.content_id,
          response: answer.answer,
          isCorrect: answer.is_correct,
          timestamp: answer.submitted_at
        }))
      };
    });
    
    setStudentProgress(progressData);
  }, [participants, answers, participantsLoading, answersLoading, lessonId]);
  
  const handlePreviousSlide = async () => {
    if (currentSlideIndex > 0 && sessionId) {
      const newIndex = currentSlideIndex - 1;
      const success = await updateSessionSlide(sessionId, newIndex);
      
      if (success) {
        setCurrentSlideIndex(newIndex);
      } else {
        toast.error("Failed to update slide");
      }
    }
  };
  
  const handleNextSlide = async () => {
    if (lesson && currentSlideIndex < lesson.slides.length - 1 && sessionId) {
      const newIndex = currentSlideIndex + 1;
      const success = await updateSessionSlide(sessionId, newIndex);
      
      if (success) {
        setCurrentSlideIndex(newIndex);
      } else {
        toast.error("Failed to update slide");
      }
    }
  };
  
  const toggleSyncMode = async () => {
    if (!sessionId || !sessionData) return;
    
    const newSyncState = !sessionData.is_synced;
    
    try {
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ is_synced: newSyncState })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error updating sync mode:", error);
        toast.error("Failed to update sync mode");
        return;
      }
      
      toast.success(newSyncState 
        ? "All students synced to your view" 
        : "Students can now navigate freely"
      );
    } catch (err) {
      console.error("Exception in toggleSyncMode:", err);
      toast.error("An error occurred while updating sync mode");
    }
  };
  
  const toggleAnonymousMode = () => {
    setAnonymousMode(!anonymousMode);
    toast.success(anonymousMode ? "Student names visible" : "Student names hidden");
  };
  
  const toggleStudentView = () => {
    setStudentView(!studentView);
  };
  
  const copyJoinCode = () => {
    navigator.clipboard.writeText(joinCode);
    toast.success("Join code copied to clipboard");
  };
  
  const endSession = async () => {
    if (!sessionId) return;
    
    const success = await endPresentationSession(sessionId);
    
    if (success) {
      toast.success("Presentation session ended");
      navigate('/dashboard');
    } else {
      toast.error("Failed to end session");
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading presentation...</p>
      </div>
    );
  }
  
  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error loading presentation</p>
      </div>
    );
  }
  
  const currentSlide = lesson.slides[currentSlideIndex];
  const syncEnabled = sessionData?.is_synced ?? true;
  const activeStudents = participants?.length ?? 0;

  return (
    <div className="container py-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeftCircle className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold ml-4">{lesson.title}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant={studentView ? "default" : "outline"} 
            size="sm" 
            onClick={toggleStudentView}
          >
            <Eye className="mr-2 h-4 w-4" />
            {studentView ? "Teacher View" : "Student View"}
          </Button>
          
          <Button
            variant="destructive"
            size="sm"
            onClick={endSession}
          >
            End Session
          </Button>
        </div>
      </div>
      
      {!studentView ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Card className="mb-4">
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{currentSlide.title}</h2>
                  <div className="text-sm text-muted-foreground">
                    Slide {currentSlideIndex + 1} of {lesson.slides.length}
                  </div>
                </div>
                
                <LessonSlideView slide={currentSlide} />
                
                <div className="flex justify-between mt-6">
                  <Button 
                    onClick={handlePreviousSlide} 
                    disabled={currentSlideIndex === 0}
                    className="flex items-center"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button 
                    onClick={handleNextSlide} 
                    disabled={currentSlideIndex === lesson.slides.length - 1}
                    className="flex items-center"
                  >
                    Next
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-1">
            <div className="space-y-4">
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-1">Join Code</h3>
                  <div className="flex justify-between items-center">
                    <div className="text-xl font-semibold">{joinCode}</div>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={copyJoinCode}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="text-sm text-muted-foreground mt-1">
                    {activeStudents} active student{activeStudents !== 1 ? 's' : ''}
                  </div>
                </CardContent>
              </Card>
            
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Lesson Controls</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sync Student Slides</span>
                      <Button 
                        variant={syncEnabled ? "default" : "outline"} 
                        size="sm" 
                        onClick={toggleSyncMode}
                        className={syncEnabled ? "bg-green-600 hover:bg-green-700" : ""}
                      >
                        {syncEnabled ? (
                          <>
                            <Lock className="mr-2 h-4 w-4" />
                            Synced
                          </>
                        ) : (
                          <>
                            <Unlock className="mr-2 h-4 w-4" />
                            Free
                          </>
                        )}
                      </Button>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Anonymous Mode</span>
                      <Button 
                        variant={anonymousMode ? "default" : "outline"} 
                        size="sm" 
                        onClick={toggleAnonymousMode}
                      >
                        {anonymousMode ? <Users className="h-4 w-4" /> : <Users className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardContent className="p-4">
                  <h3 className="font-medium mb-3">Student Responses</h3>
                  <StudentResponseList 
                    studentProgress={studentProgress}
                    currentSlideId={currentSlide.id}
                    anonymousMode={anonymousMode}
                  />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex justify-center">
          <div className="w-full max-w-3xl">
            <Card>
              <CardContent className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-xl font-semibold">{currentSlide.title}</h2>
                  <div className="text-sm text-muted-foreground">
                    Slide {currentSlideIndex + 1} of {lesson.slides.length}
                  </div>
                </div>
                
                <LessonSlideView slide={currentSlide} isStudentView={true} />
                
                <div className="flex justify-between mt-6">
                  <Button 
                    onClick={handlePreviousSlide} 
                    disabled={currentSlideIndex === 0 || syncEnabled}
                    className="flex items-center"
                  >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Previous
                  </Button>
                  <Button 
                    onClick={handleNextSlide} 
                    disabled={currentSlideIndex === lesson.slides.length - 1 || syncEnabled}
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
      )}
    </div>
  );
};

export default LessonPresentation;
