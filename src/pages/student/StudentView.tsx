
import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/context/AuthContext';
import { sampleLessons, mockStudentProgress } from '@/data/lessons';
import { Lesson, StudentProgress } from '@/types/lesson';
import { ArrowLeft, ArrowRight, Calculator } from 'lucide-react';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const StudentView: React.FC = () => {
  const { user } = useAuth();
  
  const [activeLesson, setActiveLesson] = useState<Lesson | null>(null);
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [syncMode, setSyncMode] = useState(true);
  const [progress, setProgress] = useState<StudentProgress | null>(null);
  
  useEffect(() => {
    // In a real app, we would fetch the active lesson or check if there's
    // a lesson being presented by the teacher
    setTimeout(() => {
      setActiveLesson(sampleLessons[0]);
      const userProgress = mockStudentProgress.find(p => p.studentId === user?.id);
      if (userProgress) {
        setProgress(userProgress);
        // Find the index of the current slide
        const slideIndex = sampleLessons[0].slides.findIndex(
          slide => slide.id === userProgress.currentSlide
        );
        if (slideIndex !== -1) {
          setCurrentSlideIndex(slideIndex);
        }
      }
      setLoading(false);
    }, 1000);
  }, [user?.id]);
  
  const handlePreviousSlide = () => {
    if (currentSlideIndex > 0 && !syncMode) {
      setCurrentSlideIndex(currentSlideIndex - 1);
    }
  };
  
  const handleNextSlide = () => {
    if (activeLesson && currentSlideIndex < activeLesson.slides.length - 1 && !syncMode) {
      setCurrentSlideIndex(currentSlideIndex + 1);
    }
  };
  
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse-gentle text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/50"></div>
          <h3 className="text-lg font-medium text-primary">Loading lesson...</h3>
        </div>
      </div>
    );
  }
  
  if (!activeLesson) {
    return (
      <div className="container py-8">
        <Card>
          <CardContent className="p-8 text-center">
            <h2 className="text-2xl font-bold mb-4">No Active Lesson</h2>
            <p className="text-muted-foreground">
              There is no active lesson at the moment. Please wait for your teacher to start a lesson.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  const currentSlide = activeLesson.slides[currentSlideIndex];

  return (
    <div className="container py-4 px-4 md:px-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold">{activeLesson.title}</h1>
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <Calculator className="h-4 w-4 mr-2" />
              Calculator
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-80 h-96 p-0">
            <div className="h-full w-full">
              <iframe 
                src="https://www.desmos.com/scientific" 
                title="Desmos Scientific Calculator"
                className="w-full h-full border-0"
              />
            </div>
          </PopoverContent>
        </Popover>
      </div>
      
      <div className="flex justify-center">
        <div className="w-full max-w-3xl">
          <Card>
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-semibold">{currentSlide.title}</h2>
                <div className="text-sm text-muted-foreground">
                  Slide {currentSlideIndex + 1} of {activeLesson.slides.length}
                </div>
              </div>
              
              <LessonSlideView 
                slide={currentSlide} 
                isStudentView={true} 
                studentId={user?.id}
                onResponseSubmit={(blockId, response) => {
                  console.log('Response submitted:', blockId, response);
                  // In a real app, we would send this to the server
                }}
              />
              
              <div className="flex justify-between mt-6">
                <Button 
                  onClick={handlePreviousSlide} 
                  disabled={currentSlideIndex === 0 || syncMode}
                  className="flex items-center"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous
                </Button>
                <Button 
                  onClick={handleNextSlide} 
                  disabled={currentSlideIndex === activeLesson.slides.length - 1 || syncMode}
                  className="flex items-center"
                >
                  Next
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
              
              {syncMode && (
                <div className="text-center mt-4 text-sm text-muted-foreground">
                  Navigation controlled by teacher
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default StudentView;
