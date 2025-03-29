import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { toast } from 'sonner';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { 
  getLessonById, 
  startPresentationSession, 
  updateSessionSlide,
  endPresentationSession,
  getActiveSessionForLesson
} from '@/services/lessonService';
import { useRealTimeSync, useRealTimeCollection } from '@/hooks/useRealTimeSync';
import { supabase } from '@/integrations/supabase/client';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import SlideCarousel from '@/components/lesson/SlideCarousel';
import StudentProgressGrid from '@/components/lesson/StudentProgressGrid';
import StudentResponseList from '@/components/lesson/StudentResponseList';
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
  const [sessionId, setSessionId] = useState<string>('');
  const [joinCode, setJoinCode] = useState<string>('');
  const [studentProgressData, setStudentProgressData] = useState<StudentProgress[]>([]);
  const [anonymousMode, setAnonymousMode] = useState(false);
  const [hasExistingSession, setHasExistingSession] = useState(false);
  const [studentPacingEnabled, setStudentPacingEnabled] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [sortBy, setSortBy] = useState<string>('lastName');
  const [activeTab, setActiveTab] = useState('progress');
  
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
    // Clear any existing polling intervals to prevent memory leaks
    return () => {
      const storedIntervals = JSON.parse(localStorage.getItem('activePollingIntervals') || '[]');
      storedIntervals.forEach((id: number) => clearInterval(id));
      localStorage.setItem('activePollingIntervals', '[]');
    };
  }, []);

  // Replace the complex session management with a simpler approach
  useEffect(() => {
    const loadLessonAndSession = async () => {
      if (!lessonId || !user) return;
      
      try {
        setLoading(true);
        
        // 1. First, load the lesson data
        const fetchedLesson = await getLessonById(lessonId);
        if (!fetchedLesson) {
          toast.error("Lesson not found");
          navigate('/dashboard');
          return;
        }
        setLesson(fetchedLesson);
        
        // 2. Check URL parameters
        const urlParams = new URLSearchParams(window.location.search);
        const forceNew = urlParams.get('forceNew') === 'true';
        const specificSessionId = urlParams.get('sessionId');
        
        console.log("Loading lesson and session...");
        console.log("Force new session:", forceNew);
        console.log("Specific session ID:", specificSessionId);
        
        // 3. If we're forcing a new session, create one
        if (forceNew) {
          console.log("Creating new session as requested");
          const code = await startPresentationSession(lessonId);
          if (code) {
            // Get the new session ID
            const { data } = await supabase
              .from('presentation_sessions')
              .select('id')
              .eq('join_code', code)
              .is('ended_at', null)
              .single();
              
            if (data) {
              console.log("New session created with ID:", data.id, "and code:", code);
              setSessionId(data.id);
              setJoinCode(code);
              setCurrentSlideIndex(0);
              toast.success(`New session started with code: ${code}`);
              
              // Remove forceNew from URL without page reload
              const newUrl = new URL(window.location.href);
              newUrl.searchParams.delete('forceNew');
              window.history.replaceState({}, '', newUrl);
            }
          }
          setLoading(false);
          return;
        }
        
        // 4. If we have a specific session ID from the URL, try to use it
        if (specificSessionId) {
          console.log("Looking for specific session:", specificSessionId);
          const { data, error } = await supabase
            .from('presentation_sessions')
            .select('id, join_code, current_slide')
            .eq('id', specificSessionId)
            .is('ended_at', null)
            .single();
            
          if (!error && data) {
            console.log("Found specific session:", data);
            setSessionId(data.id);
            setJoinCode(data.join_code);
            setCurrentSlideIndex(data.current_slide);
            toast.success(`Connected to session with code: ${data.join_code}`);
            setLoading(false);
            return;
          } else {
            console.log("Specified session not found or ended");
          }
        }
        
        // 5. If we don't have a specific session, look for any active session for this lesson
        console.log("Looking for any active session for lesson:", lessonId);
        const existingSession = await getActiveSessionForLesson(lessonId);
        
        if (existingSession) {
          console.log("Found existing session:", existingSession);
          setSessionId(existingSession.id);
          setJoinCode(existingSession.join_code);
          setCurrentSlideIndex(existingSession.current_slide);
          toast.success(`Reconnected to existing session with code: ${existingSession.join_code}`);
        } else {
          // 6. If no active session exists, create a new one
          console.log("No active session found, creating a new one");
          const code = await startPresentationSession(lessonId);
          if (code) {
            // Get the new session ID
            const { data } = await supabase
              .from('presentation_sessions')
              .select('id')
              .eq('join_code', code)
              .is('ended_at', null)
              .single();
              
            if (data) {
              console.log("New session created with ID:", data.id, "and code:", code);
              setSessionId(data.id);
              setJoinCode(code);
              setCurrentSlideIndex(0);
              toast.success(`New session started with code: ${code}`);
            }
          } else {
            toast.error("Failed to start presentation session");
          }
        }
      } catch (error) {
        console.error('Error loading lesson and session:', error);
        toast.error('An error occurred loading the presentation');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    loadLessonAndSession();
  }, [lessonId, user, navigate]);
  
  useEffect(() => {
    if (sessionData && !sessionLoading) {
      setCurrentSlideIndex(sessionData.current_slide);
    }
  }, [sessionData, sessionLoading]);
  
  useEffect(() => {
    if (!sessionId) return;
    
    refreshParticipants();
    refreshAnswers();
    
    const pollingInterval = setInterval(() => {
      refreshParticipants();
      
      setTimeout(() => {
        refreshAnswers();
      }, 1000);
    }, 10000);
    
    return () => clearInterval(pollingInterval);
  }, [sessionId, refreshParticipants, refreshAnswers]);
  
  useEffect(() => {
    if (!participants || !answers || participantsLoading || answersLoading) return;
    
    // Don't update studentProgressData if participants array is empty but we already have data
    // This prevents flickering between "no students" and showing students
    if (participants.length === 0 && studentProgressData.length > 0) {
      console.log("Ignoring empty participants update to prevent flickering");
      return;
    }
    
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
  }, [participants, answers, participantsLoading, answersLoading, lessonId, studentProgressData.length]);
  
  // Add session to localStorage when it's established
  useEffect(() => {
    if (sessionId && lessonId && joinCode) {
      // Store session info in localStorage to remember between page reloads
      localStorage.setItem('lastTeacherSession', JSON.stringify({
        sessionId,
        lessonId,
        joinCode,
        currentSlideIndex,
        timestamp: new Date().toISOString()
      }));
    }
  }, [sessionId, lessonId, joinCode, currentSlideIndex]);

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
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ is_synced: newSyncState })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error updating sync mode:", error);
        toast.error("Failed to update sync mode");
        return;
      }
      
      if (newSyncState && participants && participants.length > 0) {
        for (const participant of participants) {
          console.log(`Syncing student ${participant.user_id} to slide ${currentSlideIndex}`);
          await supabase
            .from('session_participants')
            .update({ current_slide: currentSlideIndex })
            .eq('session_id', sessionId)
            .eq('user_id', participant.user_id);
        }
        
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
          <h1 className="text-lg font-bold ml-2">{lesson.title}</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant={activeTab === "student" ? "default" : "outline"} 
            size="sm" 
            onClick={() => setActiveTab("student")}
            className="h-8 text-xs"
          >
            <Eye className="mr-1 h-4 w-4" />
            Student View
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="progress" className="text-xs">Teacher Dashboard</TabsTrigger>
          <TabsTrigger value="student" className="text-xs">Student View</TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress">
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-3">
                <div className="flex flex-row gap-6 items-center">
                  <div className="flex-shrink-0 w-[200px]">
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
                      onSortChange={setSortBy}
                    />
                  </div>
                  <div className="flex-grow pl-1">
                    <SlideCarousel 
                      slides={lesson.slides}
                      currentSlideIndex={currentSlideIndex}
                      onSlideClick={handleSlideClick}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
            
            <Card className="w-full border shadow-sm">
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-semibold">Student Progress</h2>
                    <Badge variant="outline" className="text-xs">
                      {activeStudents} {activeStudents === 1 ? 'student' : 'students'} online
                    </Badge>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button 
                      variant={viewMode === 'grid' ? "default" : "outline"} 
                      size="icon"
                      onClick={() => setViewMode('grid')}
                      className="h-7 w-7"
                    >
                      <LayoutGrid className="h-3.5 w-3.5" />
                    </Button>
                    <Button 
                      variant={viewMode === 'list' ? "default" : "outline"} 
                      size="icon"
                      onClick={() => setViewMode('list')}
                      className="h-7 w-7"
                    >
                      <LayoutList className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
                
                {viewMode === 'grid' ? (
                  <div className="max-h-[500px]">
                    <StudentProgressGrid 
                      studentProgress={studentProgressData}
                      slides={lesson.slides}
                      anonymousMode={anonymousMode}
                      sortBy={sortBy}
                      isLoading={participantsLoading || answersLoading}
                    />
                  </div>
                ) : (
                  <div className="max-h-[500px] overflow-auto space-y-3">
                    {participantsLoading || answersLoading ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        Loading student data...
                      </div>
                    ) : studentProgressData.length === 0 ? (
                      <div className="text-center py-4 text-sm text-muted-foreground">
                        No students have joined this session yet
                      </div>
                    ) : (
                      <div className="space-y-3">
                        <div className="text-xs font-medium ml-1">Current Student Responses:</div>
                        <StudentResponseList
                          studentProgress={studentProgressData}
                          currentSlideId={currentSlide.id}
                          anonymousMode={anonymousMode}
                        />
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="student">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardContent className="p-4">
                <div className="flex justify-between items-center mb-2">
                  <h2 className="text-sm font-semibold">{currentSlide.title}</h2>
                  <div className="text-xs text-muted-foreground">
                    Slide {currentSlideIndex + 1} of {lesson.slides.length}
                  </div>
                </div>
                
                <div className="border rounded-md p-2 bg-muted/5">
                  <LessonSlideView slide={currentSlide} isStudentView={true} />
                </div>
                
                <div className="flex justify-between items-center mt-3">
                  <Button 
                    onClick={handlePreviousSlide} 
                    disabled={currentSlideIndex === 0 || syncEnabled}
                    size="default"
                    className="flex items-center gap-1 h-9 px-3"
                    variant={currentSlideIndex === 0 ? "outline" : "default"}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    <span>Previous</span>
                  </Button>
                  
                  <div className="text-xs font-medium bg-muted/20 rounded-md px-2 py-1">
                    {currentSlideIndex + 1} / {lesson.slides.length}
                  </div>
                  
                  <Button 
                    onClick={handleNextSlide} 
                    disabled={currentSlideIndex === lesson.slides.length - 1 || syncEnabled}
                    size="default"
                    className="flex items-center gap-1 h-9 px-3"
                    variant={currentSlideIndex === lesson.slides.length - 1 ? "outline" : "default"}
                  >
                    <span>Next</span>
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
                
                {syncEnabled && (
                  <div className="text-center mt-3 text-xs text-muted-foreground bg-muted/10 rounded-md p-2">
                    <span className="flex items-center justify-center gap-1">
                      Navigation controlled by teacher
                    </span>
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-2">Student List</h3>
                {participantsLoading ? (
                  <div className="text-sm text-center py-4 text-muted-foreground">
                    Loading student data...
                  </div>
                ) : studentProgressData.length === 0 ? (
                  <div className="text-sm text-center py-4 text-muted-foreground">
                    No students have joined yet
                  </div>
                ) : (
                  <div className="space-y-2 max-h-[400px] overflow-auto">
                    {studentProgressData.map((student, index) => (
                      <div 
                        key={student.studentId}
                        className="flex items-center justify-between p-2 bg-muted/30 rounded-md text-xs"
                      >
                        <span className="flex items-center">
                          <UserCircle className="h-4 w-4 mr-2 text-primary" />
                          {anonymousMode ? `Student ${index + 1}` : student.studentName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          Slide {parseInt(student.currentSlide) + 1}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
                
                <h3 className="text-sm font-medium mb-2 mt-4">Current Slide Responses</h3>
                {participantsLoading || answersLoading ? (
                  <div className="text-sm text-center py-4 text-muted-foreground">
                    Loading responses...
                  </div>
                ) : (
                  <StudentResponseList
                    studentProgress={studentProgressData}
                    currentSlideId={currentSlide.id}
                    anonymousMode={anonymousMode}
                  />
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default LessonPresentation;
