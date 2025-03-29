
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { 
  ArrowLeft, 
  ArrowRight, 
  ArrowLeftCircle,
  Eye,
  UserCircle,
  LayoutGrid,
  LayoutList
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Lesson, LessonSlide, StudentProgress } from '@/types/lesson';
import { toast } from '@/components/ui/sonner';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { 
  getLessonById, 
  startPresentationSession, 
  updateSessionSlide,
  endPresentationSession
} from '@/services/lessonService';
import { useRealTimeSync, useRealTimeCollection } from '@/hooks/useRealTimeSync';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import SlideCarousel from '@/components/lesson/SlideCarousel';
import StudentProgressGrid from '@/components/lesson/StudentProgressGrid';
import LessonControls from '@/components/lesson/LessonControls';

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
  const [studentProgressData, setStudentProgressData] = useState<StudentProgress[]>([]);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [activeTab, setActiveTab] = useState<string>('grid');
  const [studentPacingEnabled, setStudentPacingEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  
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
  
  useEffect(() => {
    const checkExistingSession = async () => {
      if (!lessonId || !user) return;
      
      try {
        // Check if a specific sessionId was provided in URL query params
        const urlParams = new URLSearchParams(window.location.search);
        const specificSessionId = urlParams.get('sessionId');
        
        if (specificSessionId) {
          // If a specific sessionId was provided, use that one directly
          const { data, error } = await supabase
            .from('presentation_sessions')
            .select('id, join_code, current_slide')
            .eq('id', specificSessionId)
            .is('ended_at', null)
            .single();
            
          if (error) {
            console.error('Error fetching specified session:', error);
            return;
          }
          
          if (data) {
            setHasExistingSession(true);
            setSessionId(data.id);
            setJoinCode(data.join_code);
            setCurrentSlideIndex(data.current_slide);
            toast.success(`Reconnected to existing session with code: ${data.join_code}`);
            return; // Exit early since we found our specific session
          }
        }
        
        // If no specific sessionId was provided or it wasn't found, fallback to finding latest session
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
  
  useEffect(() => {
    if (!sessionId) return;
    
    // Initial refresh
    refreshParticipants();
    refreshAnswers();
    
    // Set a less frequent polling interval to avoid resource exhaustion
    const pollingInterval = setInterval(() => {
      refreshParticipants();
      
      // Stagger the refreshes to avoid concurrent requests
      setTimeout(() => {
        refreshAnswers();
      }, 1000);
    }, 10000);
    
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
    
    setStudentProgressData(progressData);
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
  
  const handleSlideClick = async (index: number) => {
    if (lesson && sessionId && index >= 0 && index < lesson.slides.length) {
      const success = await updateSessionSlide(sessionId, index);
      
      if (success) {
        setCurrentSlideIndex(index);
      } else {
        toast.error("Failed to update slide");
      }
    }
  };
  
  const toggleSyncMode = async () => {
    if (!sessionId || !sessionData) return;
    
    const newSyncState = !sessionData.is_synced;
    
    try {
      // First update the session's sync state
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ is_synced: newSyncState })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error updating sync mode:", error);
        toast.error("Failed to update sync mode");
        return;
      }
      
      // If students are now synced, force their slides to current position
      if (newSyncState && participants && participants.length > 0) {
        // Update all students to the current slide if syncing
        for (const participant of participants) {
          console.log(`Syncing student ${participant.user_id} to slide ${currentSlideIndex}`);
          await supabase
            .from('session_participants')
            .update({ current_slide: currentSlideIndex })
            .eq('session_id', sessionId)
            .eq('user_id', participant.user_id);
        }
        
        // Force refresh participants data
        setTimeout(() => {
          refreshParticipants();
        }, 500);
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
  
  const toggleStudentPacing = () => {
    setStudentPacingEnabled(!studentPacingEnabled);
    toast.success(studentPacingEnabled 
      ? "Students limited to one slide at a time" 
      : "Students can view multiple slides"
    );
  };
  
  const togglePause = () => {
    setIsPaused(!isPaused);
    toast.success(isPaused ? "Session resumed" : "Session paused");
  };
  
  const toggleStudentView = () => {
    setStudentView(!studentView);
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
    <div className="container py-4 max-w-full">
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
        </div>
      </div>
      
      {!studentView ? (
        <div className="space-y-4">
          {/* Control Bar */}
          <LessonControls 
            joinCode={joinCode}
            activeStudents={activeStudents}
            anonymousMode={anonymousMode}
            syncEnabled={syncEnabled}
            studentPacingEnabled={studentPacingEnabled}
            isPaused={isPaused}
            onToggleAnonymous={toggleAnonymousMode}
            onToggleSync={toggleSyncMode}
            onTogglePacing={toggleStudentPacing}
            onTogglePause={togglePause}
            onEndSession={endSession}
          />
          
          {/* Slide Carousel */}
          <div className="mb-4">
            <SlideCarousel 
              slides={lesson.slides}
              currentSlideIndex={currentSlideIndex}
              onSlideClick={handleSlideClick}
            />
          </div>
          
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
            {/* Current Slide Preview */}
            <div className="lg:col-span-2">
              <Card>
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
            
            {/* Student Progress */}
            <div className="lg:col-span-3">
              <Card>
                <CardContent className="p-6">
                  <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-semibold">Student Progress</h2>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant={viewMode === 'grid' ? "default" : "outline"} 
                        size="icon"
                        onClick={() => setViewMode('grid')}
                      >
                        <LayoutGrid className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant={viewMode === 'list' ? "default" : "outline"} 
                        size="icon"
                        onClick={() => setViewMode('list')}
                      >
                        <LayoutList className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {participantsLoading ? (
                    <div className="text-center py-8">Loading student data...</div>
                  ) : (
                    viewMode === 'grid' ? (
                      <div className="max-h-[550px] overflow-auto">
                        <StudentProgressGrid 
                          studentProgress={studentProgressData}
                          slides={lesson.slides}
                          anonymousMode={anonymousMode}
                        />
                      </div>
                    ) : (
                      <div className="max-h-[550px] overflow-auto space-y-4">
                        {studentProgressData.length === 0 ? (
                          <div className="text-center py-8 text-muted-foreground">
                            No students have joined this session yet
                          </div>
                        ) : (
                          studentProgressData.map((student, index) => (
                            <div key={student.studentId} className="border rounded-md p-4">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                  <UserCircle className="h-8 w-8 mr-3 text-primary" />
                                  <div>
                                    <h3 className="font-medium">
                                      {anonymousMode 
                                        ? `Student ${index + 1}` 
                                        : student.studentName}
                                    </h3>
                                    <p className="text-xs text-muted-foreground">
                                      Current: Slide {parseInt(student.currentSlide) + 1}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-muted-foreground">
                                    Answers: {student.responses.length}
                                  </p>
                                </div>
                              </div>
                              
                              {student.responses.length > 0 && (
                                <>
                                  <Separator className="my-3" />
                                  <div>
                                    <h4 className="text-sm font-medium mb-2">Responses:</h4>
                                    <div className="space-y-2">
                                      {student.responses.map((response, idx) => (
                                        <div key={idx} className="text-sm bg-muted p-2 rounded flex justify-between items-start">
                                          <div>
                                            <p className="font-medium">Slide {lesson.slides.findIndex(s => s.id === response.slideId) + 1}, Block {response.blockId.substring(0, 6)}</p>
                                            <p className="truncate max-w-[300px]">A: {String(response.response)}</p>
                                          </div>
                                          <div>
                                            {response.isCorrect === true ? (
                                              <span className="text-green-600 font-medium">Correct</span>
                                            ) : response.isCorrect === false ? (
                                              <span className="text-red-500 font-medium">Incorrect</span>
                                            ) : (
                                              <span className="text-muted-foreground">Pending</span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )
                  )}
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
