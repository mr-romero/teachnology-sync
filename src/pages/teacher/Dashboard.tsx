import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  ClipboardEdit, 
  Play,
  ChevronRight,
  Trash2,
  School,
  Clock,
  Calendar,
  ExternalLink,
  Eye
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Lesson } from '@/types/lesson';
import { getLessonsForUser, deleteLesson, endPresentationSession, getActiveSessionForLesson } from '@/services/lessonService';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter 
} from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';
import PresentationDialog from '@/components/lesson/PresentationDialog';
import { classroomService, ImportedClassroom } from '@/services/classroomService';
import GoogleClassroomIcon from '@/components/ui/google-classroom-icon';
import LessonPreviewModal from '@/components/lesson/LessonPreviewModal';
import { Checkbox } from "@/components/ui/checkbox";

interface ActiveSession {
  id: string;
  join_code: string;
  presentation_id: string;
  presentation_title: string;
  started_at: string;
  active_students: number;
  classroom_name?: string;
  classroom_id?: string;
}

interface LessonWithSessions extends Lesson {
  sessions: ActiveSession[];
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();  // Add useNavigate hook
  const [lessons, setLessons] = useState<LessonWithSessions[]>([]);
  const [loading, setLoading] = useState(true);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedLessons, setSelectedLessons] = useState<Set<string>>(new Set());
  const [isDeletionMode, setIsDeletionMode] = useState(false);
  
  // State for lesson sessions dialog
  const [selectedLessonId, setSelectedLessonId] = useState<string | null>(null);
  const [isSessionsDialogOpen, setIsSessionsDialogOpen] = useState(false);
  
  // Presentation dialog state
  const [presentingLessonId, setPresentingLessonId] = useState<string | null>(null);
  const [isPresentationDialogOpen, setIsPresentationDialogOpen] = useState(false);

  // Function to fetch lessons and their sessions
  const fetchLessonsAndSessions = async () => {
    if (!user) return;
    
    try {
      setLoading(true);
      
      // 1. Fetch all lessons
      const fetchedLessons = await getLessonsForUser(user.id);
      
      // 2. Fetch all active sessions - but don't request classroom_name directly
      // as it might not exist in the database yet
      const { data: sessionData, error: sessionError } = await supabase
        .from('presentation_sessions')
        .select(`
          id, 
          join_code, 
          started_at, 
          presentation_id,
          presentations(title),
          classroom_id
        `)
        .is('ended_at', null)
        .order('started_at', { ascending: false });
      
      if (sessionError) throw sessionError;
      
      // 3. Get classroom names for sessions with classroom_id
      const sessionsWithClassroomIds = sessionData?.filter(s => s.classroom_id) || [];
      
      // Create a map for classroom IDs to names
      let classroomMap: {[key: string]: string} = {};
      
      if (sessionsWithClassroomIds.length > 0) {
        // Extract unique classroom IDs
        const uniqueClassroomIds = Array.from(
          new Set(sessionsWithClassroomIds.map(s => s.classroom_id))
        ).filter(Boolean) as string[];
        
        if (uniqueClassroomIds.length > 0) {
          const { data: classrooms } = await supabase
            .from('imported_classrooms')
            .select('classroom_id, classroom_name')
            .in('classroom_id', uniqueClassroomIds);
            
          if (classrooms?.length) {
            // Create the map
            classroomMap = classrooms.reduce((map, classroom) => {
              map[classroom.classroom_id] = classroom.classroom_name;
              return map;
            }, {} as {[key: string]: string});
          }
        }
      }
      
      // 4. Process session data
      const sessionsWithClassroomInfo: ActiveSession[] = await Promise.all(
        (sessionData || []).map(async (session) => {
          // Get student count for the session
          const { count } = await supabase
            .from('session_participants')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);
          
          // Get classroom name from our map if available
          let classroomName = "Class Session";
          if (session.classroom_id && classroomMap[session.classroom_id]) {
            classroomName = classroomMap[session.classroom_id];
          }
          
          return {
            id: session.id,
            join_code: session.join_code,
            presentation_id: session.presentation_id,
            presentation_title: session.presentations?.[0]?.title || 'Untitled',
            started_at: session.started_at,
            active_students: count || 0,
            classroom_name: classroomName,
            classroom_id: session.classroom_id
          };
        })
      );
      
      // 5. Group sessions by lesson
      const lessonsWithSessions: LessonWithSessions[] = fetchedLessons.map(lesson => ({
        ...lesson,
        sessions: sessionsWithClassroomInfo.filter(session => session.presentation_id === lesson.id)
      }));
      
      // 6. Sort lessons by creation date (newest first by default)
      lessonsWithSessions.sort((a, b) => 
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      
      setLessons(lessonsWithSessions);
      
    } catch (error) {
      console.error('Error fetching lessons and sessions:', error);
      toast.error('Failed to load lessons');
    } finally {
      setLoading(false);
    }
  };
  
  useEffect(() => {
    fetchLessonsAndSessions();
    
    // Set up real-time subscription for presentation_sessions table
    const channel = supabase
      .channel('dashboard-sessions-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'presentation_sessions'
        },
        () => {
          fetchLessonsAndSessions();
        }
      )
      .subscribe();
      
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const handleEndSession = async (sessionId: string) => {
    const success = await endPresentationSession(sessionId);
    if (success) {
      toast.success('Session ended successfully');
      fetchLessonsAndSessions();
    } else {
      toast.error('Failed to end session');
    }
  };

  const handleDeleteLesson = async () => {
    if (!lessonToDelete) return;
    
    try {
      setIsDeleting(true);
      const success = await deleteLesson(lessonToDelete.id);
      
      if (success) {
        toast.success(`Lesson "${lessonToDelete.title}" deleted successfully`);
        fetchLessonsAndSessions();
      } else {
        toast.error('Failed to delete lesson');
      }
    } catch (error) {
      console.error('Error deleting lesson:', error);
      toast.error('An error occurred while deleting the lesson');
    } finally {
      setIsDeleting(false);
      setIsDeleteModalOpen(false);
      setLessonToDelete(null);
    }
  };

  const confirmDeleteLesson = (lesson: Lesson) => {
    setLessonToDelete(lesson);
    setIsDeleteModalOpen(true);
  };

  // Open the lesson details dialog
  const handleViewLessonSessions = (lessonId: string) => {
    setSelectedLessonId(lessonId);
    setIsSessionsDialogOpen(true);
  };

  // Assign a lesson (previously called "Present")
  const handleAssignLesson = (lessonId: string) => {
    setPresentingLessonId(lessonId);
    setIsPresentationDialogOpen(true);
  };

  // Handler for creating a new session from the dialog
  const handleCreateNewSession = async (params?: { classroomId?: string }) => {
    if (!presentingLessonId) {
      toast.error("No lesson selected for assignment");
      return { sessionId: "", joinCode: "" };
    }
    try {
      // Close the dialog before navigation
      setIsPresentationDialogOpen(false);
      
      // Construct the URL with parameters
      const url = `/teacher/${presentingLessonId}?forceNew=true${params?.classroomId ? `&classroomId=${params.classroomId}` : ""}`;
      
      // Use navigate instead of window.location for better error handling
      navigate(url);
      
      return { sessionId: "redirecting", joinCode: "redirecting" };
    } catch (error) {
      console.error("Error starting presentation:", error);
      toast.error("Failed to start presentation");
      setIsPresentationDialogOpen(false);
      return { sessionId: "", joinCode: "" };
    }
  };

  // Handler for joining an existing session from the dialog
  const handleJoinExistingSession = (sessionId: string) => {
    if (!presentingLessonId) return;
    
    // Use navigate instead of window.location.href for better error handling
    setIsPresentationDialogOpen(false);
    navigate(`/teacher/${presentingLessonId}?sessionId=${sessionId}`);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  // Add handler for lesson selection
  const handleLessonSelect = (lessonId: string, checked: boolean) => {
    setSelectedLessons(prev => {
      const updated = new Set(prev);
      if (checked) {
        updated.add(lessonId);
      } else {
        updated.delete(lessonId);
      }
      return updated;
    });
  };

  // Add handler for bulk deletion
  const handleBulkDelete = async () => {
    if (selectedLessons.size === 0) return;
    
    try {
      setIsDeleting(true);
      let successCount = 0;
      
      // Delete lessons one by one
      for (const lessonId of selectedLessons) {
        const success = await deleteLesson(lessonId);
        if (success) successCount++;
      }
      
      // Show success message
      if (successCount > 0) {
        toast.success(`Successfully deleted ${successCount} lessons`);
        setSelectedLessons(new Set()); // Clear selection
        fetchLessonsAndSessions(); // Refresh the list
      }
    } catch (error) {
      console.error('Error in bulk delete:', error);
      toast.error('An error occurred while deleting lessons');
    } finally {
      setIsDeleting(false);
    }
  };

  // Add handler for toggling deletion mode
  const toggleDeletionMode = () => {
    setIsDeletionMode(!isDeletionMode);
    if (isDeletionMode) {
      // Clear selections when exiting deletion mode
      setSelectedLessons(new Set());
    }
  };

  // Add handler for viewing lesson as student (same functionality as in the editor)
  const handlePreviewAsStudent = (lessonId: string) => {
    navigate(`/student/view/${lessonId}?preview=true&slide=0`);
  };

  if (!user) {
    return (
      <div className="container py-8">
        <p>Please log in to view your dashboard</p>
      </div>
    );
  }

  // Find the selected lesson for the sessions dialog
  const selectedLesson = lessons.find(lesson => lesson.id === selectedLessonId);

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}</h1>
          <p className="text-muted-foreground">Manage your lessons and assignments</p>
        </div>
        <div className="flex gap-2">
          {isDeletionMode ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isDeleting || selectedLessons.size === 0}
                className="flex items-center"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete {selectedLessons.size} {selectedLessons.size === 1 ? 'Lesson' : 'Lessons'}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={toggleDeletionMode}
              >
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={toggleDeletionMode} variant="outline" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Lessons
              </Button>
              <Link to="/editor/new">
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Create New Lesson
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
      
      {/* Lessons List */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Your Lessons</h2>
        {loading ? (
          <p>Loading your lessons...</p>
        ) : lessons.length > 0 ? (
          <div className="space-y-4">
            {lessons.map((lesson) => (
              <Card key={lesson.id} className="overflow-hidden">
                <div className="flex flex-col md:flex-row">
                  <div className="flex-1 p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-3">
                        {isDeletionMode && (
                          <Checkbox
                            checked={selectedLessons.has(lesson.id)}
                            onCheckedChange={(checked) => handleLessonSelect(lesson.id, checked as boolean)}
                            className="mt-1"
                          />
                        )}
                        <div>
                          <h3 className="text-xl font-bold mb-1">{lesson.title}</h3>
                          <div className="flex items-center text-sm text-muted-foreground mb-2">
                            <Calendar className="h-3.5 w-3.5 mr-1" />
                            <span>Created: {formatDate(lesson.createdAt)}</span>
                          </div>
                        </div>
                      </div>
                      <Badge variant="outline" className="ml-2">
                        {lesson.slides.length} {lesson.slides.length === 1 ? 'slide' : 'slides'}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground mb-4 line-clamp-2">
                      {lesson.slides[0]?.blocks.find(block => block.type === 'text')?.content || 'No description available'}
                    </p>
                    
                    {/* Show session count if there are any */}
                    {lesson.sessions.length > 0 && (
                      <div 
                        className="flex items-center text-sm text-primary cursor-pointer mb-3 hover:underline"
                        onClick={() => handleViewLessonSessions(lesson.id)}
                      >
                        <School className="h-4 w-4 mr-1" />
                        <span>{lesson.sessions.length} active {lesson.sessions.length === 1 ? 'session' : 'sessions'}</span>
                        <ChevronRight className="h-4 w-4 ml-1" />
                      </div>
                    )}
                    
                    <div className="flex space-x-2 mt-2">
                      <Button variant="outline" asChild size="sm">
                        <Link to={`/editor/${lesson.id}`}>
                          <ClipboardEdit className="mr-2 h-4 w-4" />
                          Edit
                        </Link>
                      </Button>
                      <Button 
                        size="sm"
                        variant="default"
                        onClick={() => handleAssignLesson(lesson.id)}
                      >
                        <School className="mr-2 h-4 w-4" />
                        Assign
                      </Button>
                      
                      {/* Use the enhanced LessonPreviewModal for showing student view previews */}
                      <LessonPreviewModal
                        slides={lesson.slides}
                        title={lesson.title}
                        trigger={
                          <Button 
                            size="sm"
                            variant="outline"
                          >
                            <Eye className="mr-2 h-4 w-4" />
                            Preview
                          </Button>
                        }
                      />
                      
                      <Button 
                        variant="outline" 
                        size="sm"
                        className="border-destructive text-destructive hover:bg-destructive/10"
                        onClick={() => confirmDeleteLesson(lesson)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  {/* Right side - Recent sessions preview */}
                  {lesson.sessions.length > 0 && (
                    <div className="md:w-64 bg-muted/30 border-t md:border-t-0 md:border-l p-4">
                      <h4 className="text-sm font-medium mb-3">Recent Sessions</h4>
                      <div className="space-y-3">
                        {lesson.sessions.slice(0, 2).map(session => (
                          <div key={session.id} className="text-xs">
                            <div className="flex items-center mb-1">
                              <GoogleClassroomIcon className="h-3.5 w-3.5 mr-1 text-primary" />
                              <span className="font-medium truncate">
                                {session.classroom_name || "Class Session"}
                              </span>
                            </div>
                            <div className="flex items-center mb-1 text-muted-foreground">
                              <Clock className="h-3 w-3 mr-1" />
                              <span>{new Date(session.started_at).toLocaleDateString()}</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="w-full mt-1"
                              asChild
                            >
                              <Link to={`/teacher/${session.presentation_id}?sessionId=${session.id}`}>
                                <Play className="h-3 w-3 mr-1" />
                                Present
                              </Link>
                            </Button>
                          </div>
                        ))}
                        
                        {lesson.sessions.length > 2 && (
                          <Button 
                            variant="ghost" 
                            size="sm" 
                            className="w-full mt-1 text-xs"
                            onClick={() => handleViewLessonSessions(lesson.id)}
                          >
                            View all {lesson.sessions.length} sessions
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </Card>
            ))}
          </div>
        ) : (
          <div className="bg-muted rounded-lg p-6 text-center">
            <h3 className="font-medium mb-2">No lessons created yet</h3>
            <p className="text-muted-foreground mb-4">Create your first lesson to get started</p>
            <Link to="/editor/new">
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create New Lesson
              </Button>
            </Link>
          </div>
        )}
      </div>
      
      {/* Lesson Sessions Dialog */}
      {selectedLesson && (
        <Dialog 
          open={isSessionsDialogOpen} 
          onOpenChange={setIsSessionsDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>{selectedLesson.title} - Sessions</DialogTitle>
              <DialogDescription>
                View and manage active sessions for this lesson
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4 my-4 max-h-[60vh] overflow-y-auto">
              {selectedLesson.sessions.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No active sessions for this lesson</p>
                  <Button 
                    variant="outline" 
                    className="mt-2"
                    onClick={() => {
                      setIsSessionsDialogOpen(false);
                      handleAssignLesson(selectedLesson.id);
                    }}
                  >
                    <School className="mr-2 h-4 w-4" />
                    Assign to a Class
                  </Button>
                </div>
              ) : (
                selectedLesson.sessions.map(session => (
                  <Card key={session.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center mb-1">
                            <GoogleClassroomIcon className="h-4 w-4 mr-2 text-primary" />
                            <h3 className="font-semibold">
                              {session.classroom_name}
                            </h3>
                          </div>
                          <div className="flex items-center space-x-2 mt-1">
                            <Badge variant="outline" className="text-sm">
                              Code: {session.join_code}
                            </Badge>
                            <Badge variant="secondary" className="text-xs">
                              {session.active_students} {session.active_students === 1 ? 'student' : 'students'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-2 flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            Started: {new Date(session.started_at).toLocaleString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-2">
                          <Button 
                            size="sm"
                            variant="outline"
                            asChild
                          >
                            <Link to={`/teacher/${session.presentation_id}?sessionId=${session.id}`}>
                              <Play className="h-4 w-4 mr-1" />
                              Present
                            </Link>
                          </Button>
                          <Button 
                            size="sm"
                            variant="destructive"
                            onClick={() => handleEndSession(session.id)}
                          >
                            End
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
            
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setIsSessionsDialogOpen(false)}
              >
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsSessionsDialogOpen(false);
                  handleAssignLesson(selectedLesson.id);
                }}
              >
                <School className="mr-2 h-4 w-4" />
                Assign New
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{lessonToDelete?.title}"? 
              This action cannot be undone and all session data will be lost.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button 
              variant="outline" 
              onClick={() => setIsDeleteModalOpen(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleDeleteLesson}
              disabled={isDeleting}
            >
              {isDeleting ? 'Deleting...' : 'Delete Lesson'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Presentation Dialog (renamed to Assignment Dialog) */}
      {presentingLessonId && (
        <PresentationDialog
          lessonId={presentingLessonId}
          lessonTitle={lessons.find(l => l.id === presentingLessonId)?.title}
          isOpen={isPresentationDialogOpen}
          onClose={() => {
            setIsPresentationDialogOpen(false);
            setPresentingLessonId(null);
          }}
          onCreateNewSession={handleCreateNewSession}
          onJoinExistingSession={handleJoinExistingSession}
        />
      )}
    </div>
  );
};

export default Dashboard;
