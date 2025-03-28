
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Lesson, LessonSlide, LessonBlock } from '@/types/lesson';
import { sampleLessons } from '@/data/lessons';
import { useAuth } from '@/context/AuthContext';
import { Plus, Save, ArrowLeft, Trash } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import LessonBlockEditor from '@/components/lesson/LessonBlockEditor';

const LessonEditor: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeSlide, setActiveSlide] = useState<string>('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  
  // Initialize lesson data
  useEffect(() => {
    if (lessonId === 'new') {
      // Create a new lesson
      const newLesson: Lesson = {
        id: `lesson-${Date.now()}`,
        title: 'New Lesson',
        createdBy: user?.id || '',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        slides: [
          {
            id: `slide-${Date.now()}`,
            title: 'Slide 1',
            blocks: []
          }
        ]
      };
      setLesson(newLesson);
      setActiveSlide(newLesson.slides[0].id);
    } else {
      // Load existing lesson
      const foundLesson = sampleLessons.find(l => l.id === lessonId);
      if (foundLesson) {
        setLesson(foundLesson);
        setActiveSlide(foundLesson.slides[0].id);
      } else {
        toast.error("Lesson not found");
        navigate('/dashboard');
      }
    }
  }, [lessonId, user?.id, navigate]);

  const handleLessonTitleChange = (title: string) => {
    if (lesson) {
      setLesson({
        ...lesson,
        title,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleSlideChange = (slideId: string) => {
    setActiveSlide(slideId);
  };

  const handleAddSlide = () => {
    if (lesson) {
      const newSlide: LessonSlide = {
        id: `slide-${Date.now()}`,
        title: `Slide ${lesson.slides.length + 1}`,
        blocks: []
      };
      
      setLesson({
        ...lesson,
        slides: [...lesson.slides, newSlide],
        updatedAt: new Date().toISOString()
      });
      
      setActiveSlide(newSlide.id);
      toast.success("New slide added");
    }
  };

  const handleSlideTitleChange = (slideId: string, title: string) => {
    if (lesson) {
      setLesson({
        ...lesson,
        slides: lesson.slides.map(slide => 
          slide.id === slideId ? { ...slide, title } : slide
        ),
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleAddBlock = (type: string) => {
    if (lesson) {
      const currentSlideIndex = lesson.slides.findIndex(slide => slide.id === activeSlide);
      
      if (currentSlideIndex === -1) return;
      
      let newBlock: LessonBlock;
      
      switch (type) {
        case 'text':
          newBlock = {
            id: `block-${Date.now()}`,
            type: 'text',
            content: 'Enter your text here'
          };
          break;
        case 'image':
          newBlock = {
            id: `block-${Date.now()}`,
            type: 'image',
            url: 'https://placehold.co/600x400?text=Image+Placeholder',
            alt: 'Description of image'
          };
          break;
        case 'question':
          newBlock = {
            id: `block-${Date.now()}`,
            type: 'question',
            questionType: 'multiple-choice',
            question: 'Enter your question here',
            options: ['Option 1', 'Option 2', 'Option 3'],
            correctAnswer: 'Option 1'
          };
          break;
        case 'graph':
          newBlock = {
            id: `block-${Date.now()}`,
            type: 'graph',
            equation: 'y = x^2',
            settings: {
              xMin: -10,
              xMax: 10,
              yMin: -10,
              yMax: 10
            }
          };
          break;
        default:
          return;
      }
      
      const updatedSlides = [...lesson.slides];
      updatedSlides[currentSlideIndex].blocks.push(newBlock);
      
      setLesson({
        ...lesson,
        slides: updatedSlides,
        updatedAt: new Date().toISOString()
      });
      
      toast.success(`Added ${type} block`);
    }
  };

  const handleUpdateBlock = (slideId: string, blockId: string, updatedBlock: LessonBlock) => {
    if (lesson) {
      const updatedSlides = lesson.slides.map(slide => {
        if (slide.id === slideId) {
          return {
            ...slide,
            blocks: slide.blocks.map(block => 
              block.id === blockId ? updatedBlock : block
            )
          };
        }
        return slide;
      });
      
      setLesson({
        ...lesson,
        slides: updatedSlides,
        updatedAt: new Date().toISOString()
      });
    }
  };

  const handleDeleteBlock = (slideId: string, blockId: string) => {
    if (lesson) {
      const updatedSlides = lesson.slides.map(slide => {
        if (slide.id === slideId) {
          return {
            ...slide,
            blocks: slide.blocks.filter(block => block.id !== blockId)
          };
        }
        return slide;
      });
      
      setLesson({
        ...lesson,
        slides: updatedSlides,
        updatedAt: new Date().toISOString()
      });
      
      toast.success("Block deleted");
    }
  };

  const handleDeleteSlide = (slideId: string) => {
    if (lesson && lesson.slides.length > 1) {
      const slideIndex = lesson.slides.findIndex(slide => slide.id === slideId);
      const updatedSlides = lesson.slides.filter(slide => slide.id !== slideId);
      
      setLesson({
        ...lesson,
        slides: updatedSlides,
        updatedAt: new Date().toISOString()
      });
      
      // Set active slide to the previous one or the first one
      const newActiveIndex = Math.max(0, slideIndex - 1);
      setActiveSlide(updatedSlides[newActiveIndex].id);
      
      toast.success("Slide deleted");
    } else {
      toast.error("Cannot delete the only slide");
    }
  };

  const handleSaveLesson = () => {
    // In a real app, this would save to the database
    toast.success("Lesson saved successfully");
  };

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading lesson...</p>
      </div>
    );
  }

  const currentSlide = lesson.slides.find(slide => slide.id === activeSlide);

  return (
    <div className="container py-4">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center">
          <Button variant="ghost" size="icon" onClick={() => navigate('/dashboard')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="ml-4">
            <Input
              value={lesson.title}
              onChange={(e) => handleLessonTitleChange(e.target.value)}
              className="text-2xl font-bold bg-transparent border-0 border-b border-dashed focus-visible:ring-0 px-0 h-auto py-1"
            />
          </div>
        </div>
        <Button onClick={handleSaveLesson}>
          <Save className="mr-2 h-4 w-4" />
          Save Lesson
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-3">Slides</h3>
            <div className="space-y-2 mb-4">
              {lesson.slides.map((slide, index) => (
                <div 
                  key={slide.id}
                  className={`flex items-center justify-between p-2 rounded-md cursor-pointer transition-colors ${
                    activeSlide === slide.id ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
                  }`}
                  onClick={() => handleSlideChange(slide.id)}
                >
                  <span className="text-sm truncate flex-1">{slide.title}</span>
                  {lesson.slides.length > 1 && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-60 hover:opacity-100"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteSlide(slide.id);
                      }}
                    >
                      <Trash className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <Button variant="outline" size="sm" className="w-full" onClick={handleAddSlide}>
              <Plus className="mr-2 h-4 w-4" />
              Add Slide
            </Button>
          </div>

          <div className="bg-card rounded-lg p-4 shadow-sm">
            <h3 className="font-medium mb-3">Add Content</h3>
            <div className="grid grid-cols-2 gap-2">
              <Button variant="outline" size="sm" onClick={() => handleAddBlock('text')}>
                Text
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddBlock('image')}>
                Image
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddBlock('question')}>
                Question
              </Button>
              <Button variant="outline" size="sm" onClick={() => handleAddBlock('graph')}>
                Graph
              </Button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-3">
          {currentSlide && (
            <Card>
              <CardContent className="p-6">
                <div className="mb-4">
                  <Input
                    value={currentSlide.title}
                    onChange={(e) => handleSlideTitleChange(currentSlide.id, e.target.value)}
                    className="text-xl font-medium bg-transparent border-0 border-b border-dashed focus-visible:ring-0 px-0 py-1"
                  />
                </div>
                
                <div className="space-y-4 mt-6">
                  {currentSlide.blocks.length === 0 ? (
                    <div className="text-center py-8 border-2 border-dashed rounded-lg text-muted-foreground">
                      <p>No content blocks yet</p>
                      <p className="text-sm">Add content from the panel on the left</p>
                    </div>
                  ) : (
                    currentSlide.blocks.map((block) => (
                      <LessonBlockEditor
                        key={block.id}
                        block={block}
                        onUpdate={(updatedBlock) => 
                          handleUpdateBlock(currentSlide.id, block.id, updatedBlock as LessonBlock)
                        }
                        onDelete={() => handleDeleteBlock(currentSlide.id, block.id)}
                      />
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonEditor;
