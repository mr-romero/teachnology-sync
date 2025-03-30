import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Plus, 
  ClipboardEdit, 
  Play,
  Calendar,
  Users,
  ChevronRight,
  Eye,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Lesson } from '@/types/lesson';
import { getLessonsForUser, deleteLesson, endPresentationSession } from '@/services/lessonService';
import { supabase } from '@/integrations/supabase/client';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from '@/components/ui/sonner';

interface ActiveSession {
  id: string;
  join_code: string;
  presentation_id: string;
  presentation_title: string;
  started_at: string;
  active_students: number;
}

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSessions, setActiveSessions] = useState<ActiveSession[]>([]);
  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [lessonToDelete, setLessonToDelete] = useState<Lesson | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const fetchLessons = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        const fetchedLessons = await getLessonsForUser(user.id);
        setLessons(fetchedLessons);
      } catch (error) {
        console.error('Error fetching lessons:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchLessons();
  }, [user]);

  useEffect(() => {
    const fetchActiveSessions = async () => {
      if (!user) return;
      
      try {
        // Log what we're trying to do
        console.log("Fetching active sessions for dashboard...");
        
        const { data, error } = await supabase
          .from('presentation_sessions')
          .select(`
            id, 
            join_code, 
            started_at, 
            presentation_id,
            presentations(title)
          `)
          .is('ended_at', null)
          .order('started_at', { ascending: false });
          
        if (error) throw error;
        
        // Log what we received from the database
        console.log("Active sessions response:", data);
        
        if (data) {
          const sessionsWithStudentCount = await Promise.all(
            data.map(async (session) => {
              const { count, error: countError } = await supabase
                .from('session_participants')
                .select('*', { count: 'exact', head: true })
                .eq('session_id', session.id);
                
              // Format session with student count
              const formattedSession = {
                id: session.id,
                join_code: session.join_code,
                presentation_id: session.presentation_id,
                presentation_title: session.presentations?.title || 'Untitled',
                started_at: session.started_at,
                active_students: count || 0
              };
              
              // Log each session as we process it
              console.log(`Session ${formattedSession.id} | Code: ${formattedSession.join_code}`);
              
              return formattedSession;
            })
          );
          
          // Log the final processed sessions before setting state
          console.log("Processed sessions for dashboard:", sessionsWithStudentCount);
          setActiveSessions(sessionsWithStudentCount);
        }
      } catch (error) {
        console.error('Error fetching active sessions:', error);
      }
    };

    fetchActiveSessions();
    
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
          fetchActiveSessions();
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
      setActiveSessions(prev => prev.filter(session => session.id !== sessionId));
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
        // Update lessons list
        setLessons(prev => prev.filter(lesson => lesson.id !== lessonToDelete.id));
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

  if (!user) {
    return (
      <div className="container py-8">
        <p>Please log in to view your dashboard</p>
      </div>
    );
  }

  return (
    <div className="container py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Welcome, {user.name}</h1>
        <p className="text-muted-foreground">Manage your lessons and presentations</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Lessons</CardTitle>
            <CardDescription>Manage your created lessons</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{lessons.length}</div>
          </CardContent>
          <CardFooter>
            <Link to="/editor/new" className="w-full">
              <Button className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Create New Lesson
              </Button>
            </Link>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Active Sessions</CardTitle>
            <CardDescription>Ongoing presentation sessions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{activeSessions.length}</div>
          </CardContent>
          <CardFooter>
            <Button 
              variant={activeSessions.length > 0 ? "default" : "outline"} 
              className="w-full"
              disabled={activeSessions.length === 0}
              onClick={() => setIsSessionModalOpen(true)}
            >
              <Eye className="mr-2 h-4 w-4" />
              View Active Sessions
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Students</CardTitle>
            <CardDescription>Student engagement stats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">
              {activeSessions.reduce((sum, session) => sum + session.active_students, 0)}
            </div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              <Users className="mr-2 h-4 w-4" />
              Manage Students
            </Button>
          </CardFooter>
        </Card>
      </div>

      <Dialog open={isSessionModalOpen} onOpenChange={setIsSessionModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Active Presentation Sessions</DialogTitle>
            <DialogDescription>
              View and manage your ongoing presentation sessions
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 mt-4 max-h-[60vh] overflow-y-auto">
            {activeSessions.length === 0 ? (
              <p className="text-center text-muted-foreground py-4">No active sessions</p>
            ) : (
              activeSessions.map(session => (
                <Card key={session.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold">{session.presentation_title}</h3>
                        <div className="flex items-center space-x-2 mt-1">
                          <Badge variant="outline" className="text-sm">
                            Code: {session.join_code}
                          </Badge>
                          <Badge variant="secondary" className="text-xs">
                            {session.active_students} {session.active_students === 1 ? 'student' : 'students'}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Started: {new Date(session.started_at).toLocaleString()}
                        </p>
                      </div>
                      <div className="flex space-x-2">
                        <Button 
                          size="sm"
                          variant="outline"
                          asChild
                        >
                          <Link to={`/teacher/${session.presentation_id}?sessionId=${session.id}`}>
                            <Play className="h-4 w-4" />
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
        </DialogContent>
      </Dialog>

      <div className="mb-6">
        <h2 className="text-2xl font-bold mb-4">Your Lessons</h2>
        {loading ? (
          <p>Loading your lessons...</p>
        ) : lessons.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {lessons.map((lesson) => (
              <Card key={lesson.id}>
                <CardHeader>
                  <CardTitle>{lesson.title}</CardTitle>
                  <CardDescription>
                    {new Date(lesson.updatedAt).toLocaleDateString()} • {lesson.slides.length} slides
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground line-clamp-2">
                    {lesson.slides[0]?.blocks.find(block => block.type === 'text')?.content || 'No description available'}
                  </p>
                </CardContent>
                <CardFooter className="flex flex-col space-y-3">
                  {/* First row of buttons */}
                  <div className="flex justify-between w-full">
                    <Button variant="outline" asChild className="flex-1 mr-2">
                      <Link to={`/editor/${lesson.id}`}>
                        <ClipboardEdit className="mr-2 h-4 w-4" />
                        Edit
                      </Link>
                    </Button>
                    <Button asChild className="flex-1">
                      <Link to={`/teacher/${lesson.id}`}>
                        <Play className="mr-2 h-4 w-4" />
                        Present
                      </Link>
                    </Button>
                  </div>
                  
                  {/* Second row of buttons */}
                  <div className="flex justify-between w-full">
                    <Button 
                      variant="outline" 
                      className="flex-1 mr-2 border-destructive text-destructive hover:bg-destructive/10"
                      onClick={() => confirmDeleteLesson(lesson)}
                    >
                      <Trash2 className="mr-2 h-4 w-4" />
                      Delete
                    </Button>
                    <Button variant="outline" asChild className="flex-1">
                      <Link to={`/teacher/${lesson.id}?forceNew=true`}>
                        <Plus className="mr-2 h-4 w-4" />
                        New Session
                      </Link>
                    </Button>
                  </div>
                </CardFooter>
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteModalOpen} onOpenChange={setIsDeleteModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Delete Lesson</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{lessonToDelete?.title}"? 
              This action cannot be undone and all presentation data will be lost.
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

      <div className="mt-12">
        <h2 className="text-2xl font-bold mb-4">Recent Activity</h2>
        <Card>
          <CardContent className="p-0">
            <div className="divide-y">
              {lessons.length > 0 ? (
                lessons.slice(0, 5).map((lesson) => (
                  <div key={lesson.id} className="flex items-center justify-between p-4">
                    <div>
                      <h3 className="font-medium">{lesson.title}</h3>
                      <p className="text-sm text-muted-foreground">
                        Last updated {new Date(lesson.updatedAt).toLocaleDateString()}
                      </p>
                    </div>
                    <Link to={`/editor/${lesson.id}`}>
                      <Button variant="ghost" size="icon">
                        <ChevronRight className="h-5 w-5" />
                      </Button>
                    </Link>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-muted-foreground">
                  No recent activity
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
