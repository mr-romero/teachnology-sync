import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation, useSearchParams } from 'react-router-dom';
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
import { CelebrationConfigDialog } from '@/components/lesson/CelebrationConfigDialog';
import { getCelebrationSettings, updateCelebrationSettings, CelebrationSettings } from '@/services/userSettingsService';

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

// Interface for active session information
interface ActiveSessionInfo {
  sessionId: string;
  joinCode: string;
  presentationId: string;
  currentSlide: number;
}

interface LocationState {
  autoJoin?: boolean;
  sessionId?: string;
  presentationId?: string;
}

interface StudentViewProps {
  isPreview?: boolean;
}

// Add interface for session info type
interface SessionInfo {
  id: string;
  join_code: string;
  presentation_id: string;
  is_synced: boolean;
  ended_at: string | null;
}

const StudentView: React.FC<StudentViewProps> = () => {
  const { joinCode: urlJoinCode, lessonId: urlLessonId } = useParams<{ joinCode?: string; lessonId?: string }>();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get('preview') === 'true';
  const location = useLocation();
  const locationState = location.state as LocationState || {};
  const { user } = useAuth();
  const navigate = useNavigate();
  const [joinCode, setJoinCode] = useState<string>(urlJoinCode || '');
  const [sessionId, setSessionId] = useState<string>(locationState.sessionId || '');
  const [presentationId, setPresentationId] = useState<string>(locationState.presentationId || '');
  const [lesson, setLesson] = useState<{ title: string; slides: LessonSlide[]; settings?: any } | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number | null>(null);
  // Set isJoined to true initially if we have valid auto-join data
  const [isJoined, setIsJoined] = useState<boolean>(
    !!(locationState.autoJoin && locationState.sessionId && locationState.presentationId)
  );
  const [loading, setLoading] = useState<boolean>(false);
  const [answeredBlocks, setAnsweredBlocks] = useState<string[]>([]);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string | boolean>>({});
  const [hasActiveSession, setHasActiveSession] = useState<boolean>(false);
  const [activeSessionInfo, setActiveSessionInfo] = useState<ActiveSessionInfo | null>(null);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [allowedSlides, setAllowedSlides] = useState<number[]>([]);
  const [showCelebrationConfig, setShowCelebrationConfig] = useState(false);
  const [celebrationStyle, setCelebrationStyle] = useState<CelebrationSettings | null>(null);
  
  const { 
    data: sessionData,
    loading: sessionLoading
  } = useRealTimeSync<PresentationSession>(
    'presentation_sessions',
    'id',
    sessionId,
    null
  );
  
  // Handle direct session joining from dashboard
  useEffect(() => {
    const directJoin = async () => {
      if (locationState.autoJoin && locationState.sessionId && locationState.presentationId && user) {
        // Only load lesson data if we haven't loaded it yet
        if (!lesson) {
          setLoading(true);
          try {
            const lessonData = await getLessonById(locationState.presentationId);
            
            if (!lessonData) {
              toast.error('Failed to load lesson data');
              setLoading(false);
              return;
            }
            
            setLesson(lessonData);
            // Remove the setCurrentSlideIndex(0) here as it will be set by the session data
          } catch (error) {
            console.error('Error auto-joining session:', error);
            toast.error('Error joining session automatically');
          } finally {
            setLoading(false);
          }
        }
      }
    };
    
    directJoin();
  }, [locationState, user, lesson]);
  
  // Handle URL join code if provided
  useEffect(() => {
    if (urlJoinCode && !isJoined && user && !locationState.autoJoin) {
      setJoinCode(urlJoinCode);
      handleJoinSession();
    }
  }, [urlJoinCode, user, locationState.autoJoin, isJoined]);
  
  // Update useEffect for session data to handle preview mode
  useEffect(() => {
    if (sessionData && !sessionLoading && lesson) {
      // Skip session handling if in preview mode
      if (isPreview) {
        setCurrentSlideIndex(0); // Start at first slide in preview mode
        return;
      }

      // Get stored slide from localStorage first
      const storedData = localStorage.getItem(`student_session_${sessionId}`);
      let storedPosition = null;

      if (storedData) {
        try {
          const { currentSlideIndex: stored } = JSON.parse(storedData);
          storedPosition = Number(stored);
          // Validate stored position
          if (isNaN(storedPosition) || storedPosition < 0 || storedPosition >= lesson.slides.length) {
            console.log('Stored position invalid:', storedPosition);
            storedPosition = null;
          } else {
            console.log('Found valid stored slide position:', storedPosition);
          }
        } catch (e) {
          console.error('Error parsing stored slide data:', e);
        }
      }

      if (sessionData.is_synced) {
        // In sync mode, always use teacher's position
        console.log('Sync mode active, using teacher slide:', sessionData.current_slide);
        setCurrentSlideIndex(Number(sessionData.current_slide));
        setAllowedSlides([]);
      } else {
        console.log('Non-sync mode active');
        
        if (sessionData.paced_slides && sessionData.paced_slides.length > 0) {
          setAllowedSlides(sessionData.paced_slides);
          
          // If we have a valid stored position AND it's in allowed slides, use it
          if (storedPosition !== null && 
              storedPosition >= 0 && 
              storedPosition < lesson.slides.length && 
              sessionData.paced_slides.includes(storedPosition)) {
            console.log('Using stored slide position:', storedPosition);
            setCurrentSlideIndex(storedPosition);
            // Update the database to match localStorage
            if (user) {
              updateStudentSlide(sessionId, user.id, storedPosition);
            }
          } else {
            // Find nearest allowed slide
            const currentSlide = Number(sessionData.current_slide);
            let targetSlide = currentSlide;

            // Find the closest allowed slide
            const nextAllowedSlides = sessionData.paced_slides.filter(index => index >= currentSlide);
            const prevAllowedSlides = sessionData.paced_slides.filter(index => index < currentSlide);
            
            if (nextAllowedSlides.length > 0) {
              targetSlide = nextAllowedSlides[0];
            } else if (prevAllowedSlides.length > 0) {
              targetSlide = prevAllowedSlides[prevAllowedSlides.length - 1];
            } else if (sessionData.paced_slides.length > 0) {
              targetSlide = sessionData.paced_slides[0];
            }
            
            console.log('Using calculated paced slide position:', targetSlide);
            setCurrentSlideIndex(targetSlide);
            if (user) {
              updateStudentSlide(sessionId, user.id, targetSlide);
            }
          }
        } else {
          // Free navigation mode
          console.log('Free navigation mode');
          setAllowedSlides([]);
          
          // Use stored position if valid
          if (storedPosition !== null) {
            console.log('Using stored slide position:', storedPosition);
            setCurrentSlideIndex(storedPosition);
            // Update the database to match localStorage
            if (user) {
              updateStudentSlide(sessionId, user.id, storedPosition);
            }
          } else {
            // Only use session's current_slide if we don't have a valid stored position
            const sessionSlide = Number(sessionData.current_slide);
            if (!isNaN(sessionSlide) && sessionSlide >= 0 && sessionSlide < lesson.slides.length) {
              console.log('Using session current slide:', sessionSlide);
              setCurrentSlideIndex(sessionSlide);
            } else {
              console.log('Using default slide position: 0');
              setCurrentSlideIndex(0);
            }
          }
        }
      }

      // Update pause state
      if (sessionData.is_paused !== undefined) {
        setIsPaused(!!sessionData.is_paused);
      }
    }
  }, [sessionData, sessionLoading, sessionId, lesson, user, isPreview]);
  
  useEffect(() => {
    // Only check for active sessions if we don't have a URL join code or auto-join state
    if (urlJoinCode || locationState.autoJoin) return;
    
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
          // First cast to unknown, then to SessionInfo to handle the array type mismatch
          const sessionInfo = (data[0].presentation_sessions as unknown) as SessionInfo;
          
          // Store active session info for later use
          setActiveSessionInfo({
            sessionId: sessionInfo.id,
            joinCode: sessionInfo.join_code,
            presentationId: sessionInfo.presentation_id,
            currentSlide: data[0].current_slide
          });
          
          setHasActiveSession(true);
        }
      } catch (error) {
        console.error('Error in checkActiveSession:', error);
      }
    };
    
    checkActiveSession();
  }, [user, urlJoinCode, locationState.autoJoin]);
  
  useEffect(() => {
    const getAnsweredBlocks = async () => {
      if (!sessionId || !user) return;
      
      try {
        const { data, error } = await supabase
          .from('student_answers')
          .select('content_id, answer')
          .eq('session_id', sessionId)
          .eq('user_id', user.id);
          
        if (error) {
          console.error('Error fetching answered blocks:', error);
          return;
        }
        
        if (data) {
          // Set the list of answered block IDs
          setAnsweredBlocks(data.map(item => item.content_id));
          
          // Create a map of block ID to answer
          const answerMap: Record<string, string | boolean> = {};
          data.forEach(item => {
            // Convert string "true"/"false" to boolean values for true/false questions
            if (item.answer === "true") {
              answerMap[item.content_id] = true;
            } else if (item.answer === "false") {
              answerMap[item.content_id] = false;
            } else {
              answerMap[item.content_id] = item.answer;
            }
          });
          
          setStudentAnswers(answerMap);
        }
      } catch (error) {
        console.error('Error in getAnsweredBlocks:', error);
      }
    };
    
    getAnsweredBlocks();
  }, [sessionId, user, currentSlideIndex]); // Also fetch when slide changes

  useEffect(() => {
    if (!sessionId) return;
    
    // Get stored slide index from localStorage when session is established
    const storedData = localStorage.getItem(`student_session_${sessionId}`);
    if (storedData) {
      const { currentSlideIndex: storedIndex } = JSON.parse(storedData);
      if (lesson && storedIndex >= 0 && storedIndex < lesson.slides.length) {
        setCurrentSlideIndex(storedIndex);
      }
    }
  }, [sessionId, lesson]);

  useEffect(() => {
    if (sessionId && currentSlideIndex !== null && lesson) {
      // Only save if we have a valid slide index
      if (currentSlideIndex >= 0 && currentSlideIndex < lesson.slides.length) {
        console.log('Saving slide position to localStorage:', currentSlideIndex);
        localStorage.setItem(`student_session_${sessionId}`, JSON.stringify({
          currentSlideIndex,
          timestamp: new Date().toISOString()
        }));
      }
    }
  }, [sessionId, currentSlideIndex, lesson]);

  // Add this effect to load stored position when joining a session
  useEffect(() => {
    if (!sessionId || !user || !lesson || !isJoined) return;
    
    const storedData = localStorage.getItem(`student_session_${sessionId}`);
    if (storedData) {
      try {
        const { currentSlideIndex: storedIndex, timestamp } = JSON.parse(storedData);
        // Only use stored position if it's valid
        if (storedIndex >= 0 && storedIndex < lesson.slides.length) {
          setCurrentSlideIndex(storedIndex);
          // Update the server with the stored position
          updateStudentSlide(sessionId, user.id, storedIndex);
        }
      } catch (error) {
        console.error('Error loading stored slide position:', error);
      }
    }
  }, [sessionId, user, lesson, isJoined]);

  // Only check for active sessions if not in preview mode
  useEffect(() => {
    // Only check for active sessions if we don't have a URL join code or auto-join state
    // and we're not in preview mode
    if (urlJoinCode || locationState.autoJoin || isPreview) return;
    
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
          // First cast to unknown, then to SessionInfo to handle the array type mismatch
          const sessionInfo = (data[0].presentation_sessions as unknown) as SessionInfo;
          
          // Store active session info for later use
          setActiveSessionInfo({
            sessionId: sessionInfo.id,
            joinCode: sessionInfo.join_code,
            presentationId: sessionInfo.presentation_id,
            currentSlide: data[0].current_slide
          });
          
          setHasActiveSession(true);
        }
      } catch (error) {
        console.error('Error in checkActiveSession:', error);
      }
    };
    
    checkActiveSession();
  }, [user, urlJoinCode, locationState.autoJoin, isPreview]);

  // Add useEffect to check for existing celebration settings
  useEffect(() => {
    if (user && !celebrationStyle) {
      getCelebrationSettings(user.id).then(settings => {
        if (settings) {
          setCelebrationStyle(settings);
        } else {
          // If no settings exist, show config dialog
          setShowCelebrationConfig(true);
        }
      });
    }
  }, [user]);

  // Add effect to handle preview mode with lessonId
  useEffect(() => {
    const loadPreviewLesson = async () => {
      if (isPreview && urlLessonId && !lesson) {
        setLoading(true);
        try {
          const lessonData = await getLessonById(urlLessonId);
          if (lessonData) {
            setLesson(lessonData);
            setCurrentSlideIndex(0);
          } else {
            toast.error('Failed to load lesson for preview');
            navigate('/dashboard');
          }
        } catch (error) {
          console.error('Error loading preview lesson:', error);
          toast.error('Failed to load lesson preview');
          navigate('/dashboard');
        } finally {
          setLoading(false);
        }
      }
    };

    loadPreviewLesson();
  }, [isPreview, urlLessonId, lesson, navigate]);

  // Update the join session handler to properly initialize the slide position
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
      
      // Get the current session state
      const { data: sessionData } = await supabase
        .from('presentation_sessions')
        .select('current_slide, is_synced')
        .eq('id', result.sessionId)
        .single();
        
      if (sessionData) {
        // Initialize the current slide from the session state
        setCurrentSlideIndex(Number(sessionData.current_slide));
      }
      
      const lessonData = await getLessonById(result.presentationId);
      
      if (!lessonData) {
        toast.error('Failed to load lesson data');
        setLoading(false);
        return;
      }
      
      // When joining, try to use stored position first
      const storedData = localStorage.getItem(`student_session_${result.sessionId}`);
      let initialSlide = Number(sessionData.current_slide);
      
      if (storedData) {
        try {
          const { currentSlideIndex: storedIndex } = JSON.parse(storedData);
          if (storedIndex >= 0 && storedIndex < lessonData.slides.length) {
            initialSlide = storedIndex;
          }
        } catch (error) {
          console.error('Error loading stored slide position:', error);
        }
      }
      
      setCurrentSlideIndex(initialSlide);
      setSessionId(result.sessionId);
      setJoinCode(joinCode);
      setPresentationId(result.presentationId);
      setIsJoined(true);
      
      // Update the student's position in the database with either stored or initial position
      await updateStudentSlide(result.sessionId, user.id, initialSlide);
      
      setLesson(lessonData);
      setIsJoined(true);
      
      // Update the student's position in the database
      if (sessionData) {
        await updateStudentSlide(result.sessionId, user.id, Number(sessionData.current_slide));
      }
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('An error occurred while joining the session');
    } finally {
      setLoading(false);
    }
  };

  const handleReturnToDashboard = () => {
    navigate('/student');
  };

  // Handle navigation back to editor
  const handleReturnToEditor = () => {
    if (isPreview && urlLessonId) {
      navigate(`/editor/${urlLessonId}`);
    }
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
        // Remove toast notification for successful submission
      } else {
        toast.error('Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      toast.error('An error occurred while submitting your answer');
    }
  };

  // Add celebration config handlers
  const handleSaveCelebrationConfig = async (config: CelebrationSettings) => {
    if (user) {
      await updateCelebrationSettings(user.id, config);
      setCelebrationStyle(config);
    }
    setShowCelebrationConfig(false);
  };
  
  const renderJoinForm = () => {
    // If there's an active session but user chose to start a new one,
    // show both options: continue the active session or join a new one
    if (hasActiveSession && !isJoined && activeSessionInfo) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[70vh]">
          <Card className="w-full max-w-md mb-4">
            <CardContent className="pt-6">
              <h1 className="text-2xl font-bold text-center mb-4">Active Session</h1>
              <div className="bg-muted p-4 rounded-md mb-4">
                <p className="text-center mb-2">You have an active session with code:</p>
                <p className="text-center font-mono text-xl font-bold">{activeSessionInfo.joinCode}</p>
              </div>
              <Button 
                onClick={() => {
                  // Set join code and trigger join action
                  setJoinCode(activeSessionInfo.joinCode);
                  handleJoinSession();
                }} 
                className="w-full"
              >
                Continue Session
              </Button>
            </CardContent>
          </Card>
          
          <Card className="w-full max-w-md">
            <CardContent className="pt-6">
              <h1 className="text-2xl font-bold text-center mb-4">Join New Session</h1>
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
                  variant="outline"
                >
                  {loading ? 'Joining...' : 'Join Different Session'}
                </Button>
              </div>
            </CardContent>
          </Card>
          
          <div className="mt-4">
            <Button 
              variant="ghost" 
              onClick={handleReturnToDashboard}
            >
              Return to Dashboard
            </Button>
          </div>
        </div>
      );
    }
    
    // Standard join form
    return (
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
            </div>
          </CardContent>
        </Card>
        
        <div className="mt-4">
          <Button 
            variant="ghost" 
            onClick={handleReturnToDashboard}
          >
            Return to Dashboard
          </Button>
        </div>
      </div>
    );
  };
  
  // Update the renderLessonView function
  const renderLessonView = () => {
    if (!lesson || !lesson.slides) return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-lg">Loading {isPreview ? 'preview' : 'session'}...</p>
      </div>
    );

    // In preview mode, don't validate session state
    if (!isPreview && currentSlideIndex === null) {
      return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-lg">Loading slide position...</p>
        </div>
      );
    }

    // Only validate slide index if we have a valid currentSlideIndex
    if (currentSlideIndex !== null) {
      const maxIndex = lesson.slides.length - 1;
      const safeSlideIndex = Math.min(Math.max(0, currentSlideIndex), maxIndex);

      // Only log and update if there's actually a correction needed
      if (safeSlideIndex !== currentSlideIndex) {
        console.log(`Slide index ${currentSlideIndex} out of bounds, correcting to ${safeSlideIndex}`);
        setCurrentSlideIndex(safeSlideIndex);
        return null; // Return null to prevent rendering with invalid index
      }
    }

    // Don't try to render if we don't have a valid slide index and aren't in preview mode
    if (currentSlideIndex === null && !isPreview) {
      return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-lg">Error: Could not load slide content</p>
        </div>
      );
    }

    // Use currentSlideIndex if set, otherwise use 0 for preview mode
    const slideIndex = currentSlideIndex !== null ? currentSlideIndex : 0;
    const currentSlide = lesson.slides[slideIndex];

    // Add safety check for currentSlide
    if (!currentSlide) {
      return (
        <div className="flex justify-center items-center h-screen">
          <p className="text-lg">Error: Could not load slide content</p>
        </div>
      );
    }

    const isSynced = isPreview ? false : (sessionData?.is_synced ?? false);
    const isPacedMode = isPreview ? false : (allowedSlides.length > 0);

    return (
      <div className="flex flex-col h-screen">
        {/* Header bar - fixed height */}
        <div className="bg-background shadow-sm border-b p-4">
          <div className="container mx-auto flex justify-between items-center">
            <h1 className="text-xl font-semibold">{lesson.title}</h1>
            <div className="flex items-center space-x-4">
              {isPreview && (
                <button 
                  className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-md text-sm font-medium hover:bg-yellow-200 transition-colors cursor-pointer"
                  onClick={handleReturnToEditor}
                >
                  Exit Preview Mode
                </button>
              )}
              {!isPreview && isSynced && (
                <div className="flex items-center text-sm text-muted-foreground">
                  <LockIcon className="h-4 w-4 mr-1" />
                  <span>Teacher controlled</span>
                </div>
              )}
              <div className="text-sm font-medium bg-muted/20 px-3 py-1 rounded-md">
                Slide {currentSlideIndex + 1} of {lesson.slides.length}
              </div>
              {!isPreview && (
                <div className="text-sm">
                  <span className="font-medium">Code: </span> 
                  <span className="ml-1 bg-primary/10 text-primary font-mono px-2 py-1 rounded">{joinCode}</span>
                </div>
              )}
              {!isPreview && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => navigate('/student')}
                >
                  Dashboard
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Main content area - scrollable */}
        <div className="flex-1 overflow-auto">
          <div className="container mx-auto p-4">
            {/* Add paced slides info if enabled */}
            {isPacedMode && !isSynced && !isPreview && (
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
                studentName={user?.name}
                studentClass={user?.class}
                onAnswerSubmit={isPreview ? undefined : handleSubmitAnswer}
                answeredBlocks={answeredBlocks}
                isPaused={isPaused && !isPreview}
                showCalculator={lesson.settings?.showCalculator ?? false}
                isPreviewMode={isPreview}
                studentAnswers={studentAnswers}
              />
            </div>
          </div>
        </div>
        
        {/* Footer bar - fixed height */}
        <div className="bg-background border-t p-4">
          <div className="container mx-auto flex justify-between items-center">
            <Button 
              onClick={handlePreviousSlide} 
              disabled={
                currentSlideIndex === 0 || 
                (isSynced && !isPreview) || 
                (isPacedMode && allowedSlides.indexOf(currentSlideIndex) === 0)
              }
              className="flex items-center"
            >
              <ArrowLeft className="mr-2 h-4 w-4" />
              Previous
            </Button>
            
            {/* If in paced mode, show current position in sequence */}
            {isPacedMode && !isSynced && !isPreview && (
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
                (isSynced && !isPreview) || 
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
    <div className={isJoined || isPreview ? "h-screen overflow-hidden" : "container mx-auto px-4 py-8"}>
      {(!isJoined && !isPreview) ? renderJoinForm() : renderLessonView()}
      
      <CelebrationConfigDialog
        open={showCelebrationConfig}
        onOpenChange={setShowCelebrationConfig}
        onSave={handleSaveCelebrationConfig}
        initialConfig={celebrationStyle || undefined}
      />
    </div>
  );
};

export default StudentView;
