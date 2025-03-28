
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
  Unlock 
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sampleLessons, mockStudentProgress } from '@/data/lessons';
import { Lesson, LessonSlide, LessonBlock, StudentProgress } from '@/types/lesson';
import { toast } from '@/components/ui/sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import StudentResponseList from '@/components/lesson/StudentResponseList';

const LessonPresentation: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [studentView, setStudentView] = useState(false);
  const [studentProgress, setStudentProgress] = useState<StudentProgress[]>(mockStudentProgress);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [anonymousMode, setAnonymousMode] = useState(false);
  
  useEffect(() => {
    // Load lesson data
    const foundLesson = sampleLessons.find(l => l.id === lessonId);
    if (foundLesson) {
      setLesson(foundLesson);
    } else {
      toast.error("Lesson not found");
      navigate('/dashboard');
    }
  }, [lessonId, navigate]);
  
  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };
  
  const handleNextSlide = () => {
    if (lesson && currentSlideIndex < lesson.slides.length - 1) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };
  
  const toggleSyncMode = () => {
    setSyncEnabled(!syncEnabled);
    toast.success(syncEnabled ? "Students can now navigate freely" : "All students synced to your view");
  };
  
  const toggleAnonymousMode = () => {
    setAnonymousMode(!anonymousMode);
    toast.success(anonymousMode ? "Student names visible" : "Student names hidden");
  };
  
  const toggleStudentView = () => {
    setStudentView(!studentView);
  };
  
  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading lesson...</p>
      </div>
    );
  }
  
  const currentSlide = lesson.slides[currentSlideIndex];

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
                  <h3 className="font-medium mb-3">Lesson Controls</h3>
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm">Sync Student Slides</span>
                      <Button 
                        variant={syncEnabled ? "default" : "outline"} 
                        size="sm" 
                        onClick={toggleSyncMode}
                      >
                        {syncEnabled ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
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
