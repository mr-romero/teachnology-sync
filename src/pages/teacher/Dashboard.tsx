
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
  ChevronRight
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { Lesson } from '@/types/lesson';
import { getLessonsForUser } from '@/services/lessonService';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>([]);
  const [loading, setLoading] = useState(true);

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
            <CardTitle className="text-xl">Upcoming</CardTitle>
            <CardDescription>Scheduled presentations</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              <Calendar className="mr-2 h-4 w-4" />
              Schedule a Presentation
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xl">Students</CardTitle>
            <CardDescription>Student engagement stats</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">0</div>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full" disabled>
              <Users className="mr-2 h-4 w-4" />
              Manage Students
            </Button>
          </CardFooter>
        </Card>
      </div>

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
                <CardFooter className="flex justify-between">
                  <Button variant="outline" asChild>
                    <Link to={`/editor/${lesson.id}`}>
                      <ClipboardEdit className="mr-2 h-4 w-4" />
                      Edit
                    </Link>
                  </Button>
                  <Button asChild>
                    <Link to={`/teacher/${lesson.id}`}>
                      <Play className="mr-2 h-4 w-4" />
                      Present
                    </Link>
                  </Button>
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
