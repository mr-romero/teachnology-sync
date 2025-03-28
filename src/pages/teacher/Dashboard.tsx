
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useAuth } from '@/context/AuthContext';
import { sampleLessons } from '@/data/lessons';
import { Lesson } from '@/types/lesson';
import { Edit, Play, Plus } from 'lucide-react';

const Dashboard: React.FC = () => {
  const { user } = useAuth();
  const [lessons, setLessons] = useState<Lesson[]>(sampleLessons);

  return (
    <div className="container py-8 px-4 sm:px-6">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-muted-foreground mt-1">Manage your lessons and classes</p>
        </div>
        <Button asChild>
          <Link to="/editor/new">
            <Plus className="mr-2 h-4 w-4" />
            Create Lesson
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {lessons.map((lesson) => (
          <Card key={lesson.id} className="overflow-hidden transition-all hover:shadow-md">
            <CardHeader className="bg-primary/5 pb-2">
              <CardTitle className="text-xl">{lesson.title}</CardTitle>
              <CardDescription>
                {new Date(lesson.createdAt).toLocaleDateString()}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground mb-2">
                {lesson.slides.length} slides
              </p>
            </CardContent>
            <CardFooter className="bg-background flex justify-between pt-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/editor/${lesson.id}`}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Link>
              </Button>
              <Button size="sm" asChild>
                <Link to={`/teacher/${lesson.id}`}>
                  <Play className="mr-2 h-4 w-4" />
                  Present
                </Link>
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Dashboard;
