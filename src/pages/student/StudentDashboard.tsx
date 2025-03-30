import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { ArrowRight, CalendarIcon, ClockIcon } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import { joinPresentationSession, getLessonById } from '@/services/lessonService';

interface ActiveSession {
  id: string;
  joinCode: string;
  presentationTitle: string;
  startedAt: string;
  currentSlide: number;
  totalSlides: number;
}

const StudentDashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [joiningSession, setJoiningSession] = useState<string | null>(null);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      if (!user) return;
      
      setLoading(true);
      try {
        // Get all active sessions for this student
        const { data, error } = await supabase
          .from('session_participants')
          .select(`
            session_id,
            current_slide,
            presentation_sessions(
              id,
              join_code,
              presentation_id,
              started_at,
              presentations(
                title
              )
            )
          `)
          .eq('user_id', user.id)
          .is('presentation_sessions.ended_at', null);
          
        if (error) {
          console.error('Error fetching active sessions:', error);
          setLoading(false);
          return;
        }
        
        if (!data || data.length === 0) {
          setLoading(false);
          return;
        }
        
        // Filter out any entries with null presentation_sessions
        const validData = data.filter(item => 
          item.presentation_sessions && 
          item.presentation_sessions.id && 
          item.presentation_sessions.join_code
        );
        
        if (validData.length === 0) {
          setLoading(false);
          return;
        }
        
        // Deduplicate sessions by session_id
        // This ensures a student only sees each unique session once
        const uniqueSessionIds = new Set<string>();
        const uniqueData = validData.filter(item => {
          if (uniqueSessionIds.has(item.presentation_sessions.id)) {
            return false;
          }
          uniqueSessionIds.add(item.presentation_sessions.id);
          return true;
        });
        
        // Transform the data into a format we can use
        const sessionsPromises = uniqueData.map(async (item) => {
          // Skip any items with invalid data
          if (!item.presentation_sessions || !item.presentation_sessions.presentation_id) {
            return null;
          }
          
          // Get total slides count for each presentation
          let totalSlides = 0;
          
          try {
            const { count } = await supabase
              .from('slides')
              .select('id', { count: 'exact', head: true })
              .eq('presentation_id', item.presentation_sessions.presentation_id);
              
            totalSlides = count || 0;
          } catch (err) {
            console.error('Error counting slides:', err);
          }
          
          return {
            id: item.session_id,
            joinCode: item.presentation_sessions.join_code,
            presentationTitle: item.presentation_sessions.presentations?.title || 'Unnamed Lesson',
            startedAt: item.presentation_sessions.started_at,
            currentSlide: item.current_slide,
            totalSlides: totalSlides
          };
        });
        
        const sessionsDataWithNulls = await Promise.all(sessionsPromises);
        // Filter out any null values that might have been returned
        const sessionsData = sessionsDataWithNulls.filter(session => session !== null) as ActiveSession[];
        
        setActiveSessions(sessionsData);
      } catch (error) {
        console.error('Error in fetchActiveSessions:', error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchActiveSessions();
  }, [user]);
  
  const handleDirectJoinSession = async (joinCode: string) => {
    if (!user) return;
    
    setJoiningSession(joinCode);
    
    try {
      const result = await joinPresentationSession(joinCode, user.id);
      
      if (!result) {
        toast.error('Failed to join session. Invalid code or session has ended.');
        setJoiningSession(null);
        return;
      }
      
      // Directly navigate to the session view with session data
      navigate(`/student/join/${joinCode}`, { 
        state: { 
          autoJoin: true,
          sessionId: result.sessionId,
          presentationId: result.presentationId
        }
      });
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('An error occurred while joining the session');
      setJoiningSession(null);
    }
  };
  
  const handleJoinNewSession = () => {
    navigate('/student/join');
  };

  // Format date to a more readable format
  const formatDate = (dateString: string) => {
    if (!dateString) return 'Unknown date';
    
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString(undefined, { 
        month: 'short', 
        day: 'numeric', 
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch (e) {
      return 'Invalid date';
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Your Sessions</h1>
      
      {loading ? (
        <div className="flex justify-center">
          <p>Loading your sessions...</p>
        </div>
      ) : (
        <>
          {activeSessions.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {activeSessions.map((session) => (
                <Card key={session.id} className="shadow-sm hover:shadow-md transition-shadow">
                  <CardHeader className="pb-2">
                    <CardTitle className="line-clamp-1">{session.presentationTitle}</CardTitle>
                  </CardHeader>
                  <CardContent className="pb-4">
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-muted-foreground">
                        <CalendarIcon className="h-4 w-4 mr-2" />
                        <span>{formatDate(session.startedAt)}</span>
                      </div>
                      <div className="flex items-center text-muted-foreground">
                        <ClockIcon className="h-4 w-4 mr-2" />
                        <span>Last position: Slide {session.currentSlide + 1} of {session.totalSlides || '?'}</span>
                      </div>
                      <div className="font-mono mt-2 text-primary bg-primary/10 inline-block px-2 py-1 rounded">
                        {session.joinCode}
                      </div>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      className="w-full" 
                      onClick={() => handleDirectJoinSession(session.joinCode)}
                      disabled={joiningSession === session.joinCode}
                    >
                      {joiningSession === session.joinCode ? (
                        "Joining..."
                      ) : (
                        <>
                          Continue Session
                          <ArrowRight className="h-4 w-4 ml-2" />
                        </>
                      )}
                    </Button>
                  </CardFooter>
                </Card>
              ))}
            </div>
          ) : (
            <div className="text-center">
              <h2 className="text-xl font-semibold mb-2">No Active Sessions</h2>
              <p className="text-muted-foreground mb-6">
                You don't have any active sessions. Join a new session to get started.
              </p>
              <Button onClick={handleJoinNewSession}>
                Join a Session
              </Button>
            </div>
          )}
          
          {activeSessions.length > 0 && (
            <div className="mt-8 flex justify-center">
              <Button variant="outline" onClick={handleJoinNewSession}>
                Join a New Session
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StudentDashboard;