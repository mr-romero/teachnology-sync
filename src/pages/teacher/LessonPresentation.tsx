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
  LayoutList,
  Pause,
  Edit
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
import LessonMatrix from '@/components/lesson/LessonMatrix';
import StudentResponseList from '@/components/lesson/StudentResponseList';

interface PresentationSession {
  id: string;
  join_code: string;
  current_slide: number;
  is_synced: boolean;
  active_students: number;
  is_paused: boolean;
  paced_slides?: number[]; // Add paced_slides array
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
  
  // Add new state for slide selection
  const [isSelectingSlides, setIsSelectingSlides] = useState(false);
  const [selectedSlides, setSelectedSlides] = useState<number[]>([]);
  const [pacedSlides, setPacedSlides] = useState<number[]>([]);
  
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
    
    // Deduplicate participants by user_id
    // This ensures each student appears only once in the teacher's dashboard
    const uniqueUserIds = new Set<string>();
    const uniqueParticipants = participants.filter(participant => {
      if (uniqueUserIds.has(participant.user_id)) {
        return false;
      }
      uniqueUserIds.add(participant.user_id);
      return true;
    });
    
    console.log("Deduplicated participants:", uniqueParticipants.length);
    
    const progressData: StudentProgress[] = uniqueParticipants.map(participant => {
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

  // Add this effect at the top of the file, after the state declarations
  useEffect(() => {
    if (!lesson || !sessionId) return;
    
    // Get stored slide index from localStorage
    const storedData = localStorage.getItem(`presentation_${sessionId}`);
    if (storedData) {
      const { currentSlideIndex: storedIndex } = JSON.parse(storedData);
      if (storedIndex >= 0 && storedIndex < lesson.slides.length) {
        setCurrentSlideIndex(storedIndex);
      }
    }
  }, [lesson, sessionId]);

  // Add this effect to save the current state
  useEffect(() => {
    if (sessionId && currentSlideIndex >= 0) {
      localStorage.setItem(`presentation_${sessionId}`, JSON.stringify({
        currentSlideIndex,
        timestamp: new Date().toISOString()
      }));
    }
  }, [sessionId, currentSlideIndex]);

  const handlePreviousSlide = async () => {
    if (currentSlideIndex > 0 && sessionId) {
      let newIndex = currentSlideIndex - 1;

      // If pacing is enabled, find the previous allowed slide
      if (studentPacingEnabled && pacedSlides.length > 0) {
        // Find the index of the current slide in the pacedSlides array
        const currentPacedIndex = pacedSlides.findIndex(index => index === currentSlideIndex);
        
        if (currentPacedIndex > 0) {
          // Get the previous slide in the pacedSlides array
          newIndex = pacedSlides[currentPacedIndex - 1];
        } else {
          // Already at the first paced slide, don't navigate
          return;
        }
      }
      
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
      let newIndex = currentSlideIndex + 1;

      // If pacing is enabled, find the next allowed slide
      if (studentPacingEnabled && pacedSlides.length > 0) {
        // Find the index of the current slide in the pacedSlides array
        const currentPacedIndex = pacedSlides.findIndex(index => index === currentSlideIndex);
        
        if (currentPacedIndex !== -1 && currentPacedIndex < pacedSlides.length - 1) {
          // Get the next slide in the pacedSlides array
          newIndex = pacedSlides[currentPacedIndex + 1];
        } else {
          // Already at the last paced slide or not in paced slides, don't navigate
          return;
        }
      }
      
      const success = await updateSessionSlide(sessionId, newIndex);
      
      if (success) {
        setCurrentSlideIndex(newIndex);
      } else {
        toast.error("Failed to update slide");
      }
    }
  };
  
  const handleSlideClick = async (index: number) => {
    // Only select slides if in selection mode, otherwise navigate
    if (isSelectingSlides) {
      handleSlideSelection(index);
      return;
    }
    
    // Check if we can navigate to this slide (if pacing is enabled)
    if (studentPacingEnabled && pacedSlides.length > 0) {
      // Only allow navigation to paced slides
      if (!pacedSlides.includes(index)) {
        toast.info("This slide is not available for student access");
        return;
      }
    }
    
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
    
    // If student pacing is enabled, we need to disable it first
    if (studentPacingEnabled) {
      toast.info("Disabling student pacing to enable teacher sync");
      setStudentPacingEnabled(false);
      setPacedSlides([]);
      
      // Update database to clear paced slides
      try {
        await supabase
          .from('presentation_sessions')
          .update({ paced_slides: [] })
          .eq('id', sessionId);
      } catch (error) {
        console.error("Error clearing paced slides:", error);
      }
    }
    
    const newSyncState = !sessionData.is_synced;
    
    try {
      // Update the sync state in the database
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ is_synced: newSyncState })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error updating sync mode:", error);
        toast.error("Failed to update sync mode");
        return;
      }
      
      // Force update local state
      if (sessionData) {
        sessionData.is_synced = newSyncState;
      }
      
      // If enabling sync, force-sync all students to the current slide
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
    // Instead of toggling, always go into slide selection mode when clicked
    
    // If sync is enabled, disable it first
    if (sessionData?.is_synced) {
      toggleSyncMode();
    }
    
    // Enter slide selection mode - use existing selectedSlides if they exist
    setIsSelectingSlides(true);
    
    // If pacing is already enabled, start with current paced slides
    if (studentPacingEnabled && pacedSlides.length > 0) {
      setSelectedSlides([...pacedSlides]);
    } else {
      // Otherwise start with current slide selected
      setSelectedSlides([currentSlideIndex]);
    }
    
    toast.success("Select slides for student pacing");
  };
  
  // Function to handle slide selection during pacing mode
  const handleSlideSelection = (index: number) => {
    if (!isSelectingSlides) return;
    
    setSelectedSlides(prev => {
      // If slide is already selected, remove it
      if (prev.includes(index)) {
        return prev.filter(slideIndex => slideIndex !== index);
      } else {
        // Otherwise add it
        return [...prev, index];
      }
    });
  };
  
  // Function to confirm slide selection
  const confirmSlideSelection = async () => {
    if (selectedSlides.length === 0) {
      toast.error("Please select at least one slide");
      return;
    }
    
    // Sort slides by index for better navigation
    const sortedSlides = [...selectedSlides].sort((a, b) => a - b);
    
    // Update database with selected slides
    try {
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ paced_slides: sortedSlides })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error updating paced slides:", error);
        toast.error("Failed to update paced slides");
        return;
      }
      
      // Update local state
      setPacedSlides(sortedSlides);
      setStudentPacingEnabled(true);
      setIsSelectingSlides(false);
      
      // If current slide is not in the paced slides, navigate to the first paced slide
      if (!sortedSlides.includes(currentSlideIndex) && sortedSlides.length > 0) {
        handleSlideClick(sortedSlides[0]);
      }
      
      toast.success(`Students can now only access ${sortedSlides.length} selected slides`);
    } catch (err) {
      console.error("Exception saving paced slides:", err);
      toast.error("An error occurred while updating paced slides");
    }
  };
  
  // Function to cancel slide selection
  const cancelSlideSelection = () => {
    setIsSelectingSlides(false);
    
    // Also disable pacing when canceling selection
    setStudentPacingEnabled(false);
    setPacedSlides([]);
    
    // Clear paced slides in database
    if (sessionId) {
      try {
        supabase
          .from('presentation_sessions')
          .update({ paced_slides: [] })
          .eq('id', sessionId)
          .then(() => {
            console.log("Paced slides cleared after cancellation");
          })
          .catch(err => {
            console.error("Error clearing paced slides:", err);
          });
      } catch (err) {
        console.error("Exception clearing paced slides:", err);
      }
    }
    
    toast.info("Slide selection cancelled and pacing disabled");
  };
  
  // Add keyboard handler for escape key to exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isSelectingSlides) {
        cancelSlideSelection();
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSelectingSlides]);
  
  // Function to disable student pacing entirely
  const disableStudentPacing = async () => {
    setIsSelectingSlides(false);
    setStudentPacingEnabled(false);
    setSelectedSlides([]);
    setPacedSlides([]);
    
    // Clear paced slides in database
    if (sessionId) {
      try {
        const { error } = await supabase
          .from('presentation_sessions')
          .update({ paced_slides: [] })
          .eq('id', sessionId);
        
        if (error) {
          console.error("Error clearing paced slides:", error);
          toast.error("Failed to clear paced slides");
          return;
        }
      } catch (err) {
        console.error("Exception clearing paced slides:", err);
        toast.error("An error occurred while clearing paced slides");
      }
    }
    
    toast.success("Student slide pacing disabled");
  };

  const togglePause = async () => {
    if (!sessionId) return;
    
    const newPauseState = !isPaused;
    
    try {
      // Update the pause state in the database
      const { error } = await supabase
        .from('presentation_sessions')
        .update({ is_paused: newPauseState })
        .eq('id', sessionId);
      
      if (error) {
        console.error("Error updating pause state:", error);
        toast.error("Failed to update pause state");
        return;
      }
      
      // Only update local state if database update was successful
      setIsPaused(newPauseState);
      toast.success(newPauseState ? "Session paused" : "Session resumed");
    } catch (err) {
      console.error("Exception in togglePause:", err);
      toast.error("An error occurred while updating pause state");
    }
  };
  
  // Add a useEffect to track the is_paused state from the database
  useEffect(() => {
    if (sessionData) {
      // Update the local state based on the database value
      if (sessionData.is_paused !== undefined) {
        setIsPaused(!!sessionData.is_paused);
      }
      
      // Load paced slides from database
      if (sessionData.paced_slides) {
        setPacedSlides(sessionData.paced_slides);
        setStudentPacingEnabled(sessionData.paced_slides.length > 0);
      }
    }
  }, [sessionData]);
  
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
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/teacher/editor/${lessonId}`)}
            className="h-8 text-xs flex items-center"
          >
            <Edit className="mr-1 h-4 w-4" />
            Edit Lesson
          </Button>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => navigate(`/student/view/${lessonId}`)}
            className="h-8 text-xs flex items-center"
          >
            <Eye className="mr-1 h-4 w-4" />
            Student View
          </Button>
        </div>
      </div>
      
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="mb-4 w-full justify-start">
          <TabsTrigger value="progress" className="text-xs">Teacher Dashboard</TabsTrigger>
          <TabsTrigger value="student" className="text-xs">Student Preview</TabsTrigger>
        </TabsList>
        
        <TabsContent value="progress">
          <div className="space-y-4">
            <Card className="border shadow-sm">
              <CardContent className="p-4">
                {/* Update the LessonMatrix component with needed props */}
                <LessonMatrix
                  slides={lesson.slides}
                  studentProgress={studentProgressData}
                  currentSlideIndex={currentSlideIndex}
                  joinCode={joinCode}
                  activeStudents={activeStudents}
                  anonymousMode={anonymousMode}
                  syncEnabled={syncEnabled}
                  studentPacingEnabled={studentPacingEnabled}
                  isPaused={isPaused}
                  sortBy={sortBy}
                  isLoading={participantsLoading || answersLoading}
                  onToggleAnonymous={toggleAnonymousMode}
                  onToggleSync={toggleSyncMode}
                  onTogglePacing={toggleStudentPacing}
                  onTogglePause={togglePause}
                  onSortChange={setSortBy}
                  onSlideClick={handleSlideClick}
                  isSelectingSlides={isSelectingSlides}
                  selectedSlides={selectedSlides}
                  pacedSlides={pacedSlides}
                  onSlideSelection={handleSlideSelection}
                  onConfirmSelection={confirmSlideSelection}
                  onCancelSelection={cancelSlideSelection}
                />
              </CardContent>
            </Card>
            
            {/* Keep the student response list view for detailed answers */}
            <Card className="w-full border shadow-sm">
              <CardContent className="p-4">
                <h3 className="text-sm font-medium mb-3">Current Slide Responses</h3>
                <div className="max-h-[300px] overflow-auto">
                  {participantsLoading || answersLoading ? (
                    <div className="text-center py-4 text-sm text-muted-foreground">
                      Loading responses...
                    </div>
                  ) : (
                    <StudentResponseList
                      studentProgress={studentProgressData}
                      currentSlideId={currentSlide.id}
                      anonymousMode={anonymousMode}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="student">
          {/* Keep the student view unchanged */}
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
                  <LessonSlideView 
                    slide={currentSlide} 
                    isStudentView={true} 
                    isPaused={isPaused} 
                    showCalculator={lesson.settings?.showCalculator ?? false}  // Add this line
                  />
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

                {isPaused && (
                  <div className="text-center mt-3 text-xs text-amber-600 bg-amber-50 rounded-md p-2">
                    <span className="flex items-center justify-center gap-1">
                      <Pause className="h-3.5 w-3.5 mr-1" />
                      Responses paused by teacher
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
