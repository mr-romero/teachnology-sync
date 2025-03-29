import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lesson, LessonSlide, LessonBlock, SlideLayout } from '@/types/lesson';
import { useAuth } from '@/context/AuthContext';
import { Plus, Save, ArrowLeft, Trash } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import LessonBlockEditor from '@/components/lesson/LessonBlockEditor';
import SlideCarousel from '@/components/lesson/SlideCarousel';
import BlockBasedSlideEditor from '@/components/lesson/BlockBasedSlideEditor';
import { v4 as uuidv4 } from 'uuid';
import { 
  createLesson, 
  getLessonById, 
  saveLesson 
} from '@/services/lessonService';
import LessonSlideView from '@/components/lesson/LessonSlideView';

const LessonEditor: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeSlide, setActiveSlide] = useState<string>('');
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  
  // Initialize lesson data
  useEffect(() => {
    const initLesson = async () => {
      if (!user) return;
      
      try {
        setLoading(true);
        
        if (lessonId === 'new') {
          // Create a new lesson in the database
          const newLesson = await createLesson(user.id, 'New Lesson');
          
          if (newLesson) {
            setLesson(newLesson);
            setActiveSlide(newLesson.slides[0].id);
            toast.success('New lesson created');
          } else {
            toast.error('Failed to create new lesson');
            navigate('/dashboard');
          }
        } else {
          // Load existing lesson from database
          const fetchedLesson = await getLessonById(lessonId);
          
          if (fetchedLesson) {
            setLesson(fetchedLesson);
            setActiveSlide(fetchedLesson.slides[0].id);
          } else {
            toast.error("Lesson not found");
            navigate('/dashboard');
          }
        }
      } catch (error) {
        console.error('Error initializing lesson:', error);
        toast.error('An error occurred loading the lesson');
        navigate('/dashboard');
      } finally {
        setLoading(false);
      }
    };
    
    initLesson();
  }, [lessonId, user, navigate]);

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
        id: uuidv4(),
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

  const handleSaveLesson = async () => {
    if (!lesson) return;
    
    setLoading(true);
    try {
      const success = await saveLesson(lesson);
      
      if (success) {
        toast.success("Lesson saved successfully");
      } else {
        toast.error("Error saving lesson");
      }
    } catch (error) {
      console.error('Error saving lesson:', error);
      toast.error("An error occurred while saving");
    } finally {
      setLoading(false);
    }
  };

  const handleSlideLayoutChange = (slideId: string, layout: SlideLayout) => {
    if (lesson) {
      const updatedSlides = lesson.slides.map(slide => {
        if (slide.id === slideId) {
          return {
            ...slide,
            layout
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

  // Add block preview renderer function
  const renderBlockPreview = (block: LessonBlock) => {
    switch (block.type) {
      case 'text':
        return (
          <div className="prose max-w-none">
            {block.content}
          </div>
        );
      case 'image':
        return (
          <div className="my-2 flex justify-center">
            <img 
              src={block.url} 
              alt={block.alt} 
              className="max-h-48 rounded-md"
            />
          </div>
        );
      case 'question':
        return (
          <div className="my-2 p-3 bg-primary/5 rounded-md">
            <p className="font-medium mb-2">{block.question}</p>
            {block.questionType === 'multiple-choice' && (
              <ul className="space-y-1 list-disc list-inside">
                {block.options?.map((option, index) => (
                  <li 
                    key={index}
                    className={option === block.correctAnswer ? "text-green-600 font-medium" : ""}
                  >
                    {option}
                    {option === block.correctAnswer && " (correct)"}
                  </li>
                ))}
              </ul>
            )}
            {block.questionType === 'true-false' && (
              <div className="flex space-x-4">
                <span className={block.correctAnswer === true ? "text-green-600 font-medium" : ""}>
                  True {block.correctAnswer === true && "✓"}
                </span>
                <span className={block.correctAnswer === false ? "text-green-600 font-medium" : ""}>
                  False {block.correctAnswer === false && "✓"}
                </span>
              </div>
            )}
            {block.questionType === 'free-response' && (
              <div className="border border-dashed border-muted-foreground/30 rounded-md p-2 bg-muted/30">
                <p className="text-sm text-muted-foreground">Student response area</p>
                {block.correctAnswer && (
                  <div className="mt-1">
                    <p className="text-sm font-medium">Sample answer:</p>
                    <p className="text-sm">{block.correctAnswer as string}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        );
      case 'graph':
        return (
          <div className="my-2 border rounded-md p-3 bg-gray-50 h-32 flex items-center justify-center">
            <p className="text-muted-foreground text-center text-sm">
              {block.equation}<br />
              <span className="text-xs">(Graph visualization)</span>
            </p>
          </div>
        );
      default:
        return <p>Unknown block type</p>;
    }
  };

  // Handle slide update (from block-based editor)
  const handleSlideUpdate = (updatedSlide: LessonSlide) => {
    if (lesson) {
      setLesson({
        ...lesson,
        slides: lesson.slides.map(slide => 
          slide.id === updatedSlide.id ? updatedSlide : slide
        ),
        updatedAt: new Date().toISOString()
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading lesson...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Error loading lesson</p>
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
        <Button onClick={handleSaveLesson} disabled={loading}>
          <Save className="mr-2 h-4 w-4" />
          Save Lesson
        </Button>
      </div>

      {/* Slide carousel */}
      <div className="mb-8">
        <SlideCarousel 
          slides={lesson.slides}
          currentSlideIndex={lesson.slides.findIndex(slide => slide.id === activeSlide)}
          onSlideClick={(index) => handleSlideChange(lesson.slides[index].id)}
          onDeleteSlide={handleDeleteSlide}
          allowDeletion={lesson.slides.length > 1}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="bg-card rounded-lg p-4 shadow-sm">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-medium">Content Controls</h3>
              <Button variant="outline" size="sm" onClick={handleAddSlide}>
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
          
          {currentSlide && currentSlide.blocks.length > 0 && (
            <div className="bg-card rounded-lg p-4 shadow-sm">
              <h3 className="font-medium mb-3">Edit Content</h3>
              {currentSlide.blocks.map((block) => (
                <div key={block.id} className="mb-4 border-b pb-4 last:border-b-0 last:pb-0">
                  <LessonBlockEditor
                    block={block}
                    onUpdate={(updatedBlock) => 
                      handleUpdateBlock(currentSlide.id, block.id, updatedBlock as LessonBlock)
                    }
                    onDelete={() => handleDeleteBlock(currentSlide.id, block.id)}
                  />
                </div>
              ))}
            </div>
          )}
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
                
                {/* Block-based editor */}
                <BlockBasedSlideEditor
                  slide={currentSlide}
                  onUpdateSlide={handleSlideUpdate}
                  renderBlockPreview={renderBlockPreview}
                />
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default LessonEditor;
