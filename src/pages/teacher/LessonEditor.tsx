import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Lesson, LessonSlide, LessonBlock, SlideLayout, AIChatBlock } from '@/types/lesson';
import { useAuth } from '@/context/AuthContext';
import { Plus, Save, ArrowLeft, Trash, Play, Eye, Presentation, ChevronLeft, ChevronRight, PanelLeftClose, PanelLeftOpen } from 'lucide-react';
import { toast } from '@/components/ui/sonner';
import LessonBlockEditor from '@/components/lesson/LessonBlockEditor';
import SlideCarousel from '@/components/lesson/SlideCarousel';
import BlockBasedSlideEditor from '@/components/lesson/BlockBasedSlideEditor';
import PresentationDialog from '@/components/lesson/PresentationDialog';
import GraphRenderer from '@/components/lesson/GraphRenderer';
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
  const [isPresentationDialogOpen, setIsPresentationDialogOpen] = useState(false);
  const [isBlocksCollapsed, setIsBlocksCollapsed] = useState(false);
  
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

  // Check if user had previously collapsed the blocks panel
  useEffect(() => {
    const storedCollapsedState = localStorage.getItem('blocksCollapsed');
    if (storedCollapsedState) {
      setIsBlocksCollapsed(storedCollapsedState === 'true');
    }
  }, []);

  // Save collapsed state to localStorage when it changes
  useEffect(() => {
    localStorage.setItem('blocksCollapsed', isBlocksCollapsed.toString());
  }, [isBlocksCollapsed]);

  useEffect(() => {
    // Get active slide from localStorage when component mounts
    const storedData = localStorage.getItem('currentEditorState');
    if (storedData) {
      const { lessonId: storedLessonId, activeSlide: storedActiveSlide } = JSON.parse(storedData);
      if (storedLessonId === lessonId && lesson?.slides.find(s => s.id === storedActiveSlide)) {
        setActiveSlide(storedActiveSlide);
      }
    }
  }, [lessonId, lesson]);

  useEffect(() => {
    if (lessonId && activeSlide) {
      localStorage.setItem('currentEditorState', JSON.stringify({
        lessonId,
        activeSlide
      }));
    }
  }, [lessonId, activeSlide]);

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
      
      // Clear the stored state first
      localStorage.removeItem('currentEditorState');
      
      setLesson({
        ...lesson,
        slides: [...lesson.slides, newSlide],
        updatedAt: new Date().toISOString()
      });
      
      // Set this as the active slide
      setActiveSlide(newSlide.id);
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
            url: '',
            alt: ''
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
            equations: [
              {
                id: uuidv4(),
                latex: 'y = x^2',
                color: '#c74440',
                isVisible: true
              }
            ],
            settings: {
              xMin: -10,
              xMax: 10,
              yMin: -10,
              yMax: 10,
              showGrid: true,
              showAxes: true,
              polarMode: false,
              squareAxes: false,
              allowPanning: true,
              allowZooming: true,
              showXAxis: true,
              showYAxis: true,
              xAxisLabel: '',
              yAxisLabel: '',
              backgroundColor: '#ffffff'
            }
          };
          break;
        case 'ai-chat':
          newBlock = {
            id: `block-${Date.now()}`,
            type: 'ai-chat',
            instructions: 'Ask me questions about this topic.',
            sentenceStarters: ['What is...?', 'Can you explain...?', 'Why does...?'],
            apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
            modelName: 'openai/gpt-3.5-turbo',
            systemPrompt: 'You are a helpful AI assistant for education. Help the student understand the topic while guiding them toward the correct understanding. Be encouraging and supportive.'
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
          <div className="my-2 border rounded-md p-1 bg-gray-50 h-32 overflow-hidden">
            <GraphRenderer block={block} isEditable={false} />
          </div>
        );
      case 'ai-chat':
        return (
          <div className="my-2 p-3 bg-purple-50 rounded-md">
            <p className="font-medium mb-2">AI Chat</p>
            <div className="text-sm text-muted-foreground mb-2">
              <span className="bg-purple-100 px-1.5 py-0.5 rounded text-purple-700 text-xs font-medium mr-1">
                {(block as AIChatBlock).modelName?.split('/').pop() || 'GPT-3.5'}
              </span>
              {(block as AIChatBlock).instructions || 'Chat with an AI assistant'}
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {(block as AIChatBlock).sentenceStarters?.slice(0, 3).map((starter, i) => (
                <span key={i} className="text-xs bg-muted px-1.5 py-0.5 rounded">
                  {starter}
                </span>
              ))}
              {(block as AIChatBlock).sentenceStarters?.length > 3 && (
                <span className="text-xs text-muted-foreground">
                  +{(block as AIChatBlock).sentenceStarters.length - 3} more
                </span>
              )}
            </div>
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

  // Add this useEffect after the other useEffects
  useEffect(() => {
    if (!lesson || !lessonId) return;
    
    const saveTimer = setTimeout(async () => {
      try {
        await saveLesson(lesson);
      } catch (error) {
        console.error('Error in autosave:', error);
      }
    }, 2000); // Autosave 2 seconds after last change
    
    return () => clearTimeout(saveTimer);
  }, [lesson, lessonId]);

  // Handle opening the presentation dialog
  const handleOpenPresentationDialog = () => {
    setIsPresentationDialogOpen(true);
  };

  // Handle creating a new presentation session
  const handleCreateNewSession = () => {
    if (lessonId) {
      navigate(`/teacher/presentation/${lessonId}?forceNew=true`);
    }
  };

  // Handle joining an existing presentation session
  const handleJoinExistingSession = (sessionId: string) => {
    if (lessonId) {
      navigate(`/teacher/presentation/${lessonId}?sessionId=${sessionId}`);
    }
  };

  // Add a handler to preview as student
  const handlePreviewAsStudent = () => {
    if (lessonId) {
      navigate(`/student/view/${lessonId}`);
    }
  };

  // Toggle blocks panel collapsed state
  const toggleBlocksPanel = () => {
    setIsBlocksCollapsed(!isBlocksCollapsed);
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
    <div className="container py-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
          <h1 className="text-2xl font-bold">Lesson Editor</h1>
        </div>
        
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePreviewAsStudent}
            className="flex items-center"
          >
            <Eye className="h-4 w-4 mr-1" />
            Student View
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleOpenPresentationDialog}
            className="flex items-center"
          >
            <Play className="h-4 w-4 mr-1" />
            Present Lesson
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSaveLesson}
            className="ml-4"
          >
            <Save className="h-4 w-4 mr-1" />
            Save Lesson
          </Button>
        </div>
      </div>
      
      {/* Slide carousel */}
      <div className="mb-8">
        <SlideCarousel 
          slides={lesson.slides}
          currentSlideIndex={lesson.slides.findIndex(slide => slide.id === activeSlide)}
          onSlideClick={(index) => handleSlideChange(lesson.slides[index].id)}
          onDeleteSlide={handleDeleteSlide}
          allowDeletion={lesson.slides.length > 1}
          onAddSlide={handleAddSlide}
        />
      </div>

      <div className="flex gap-4">
        {/* Collapsible Content Blocks panel */}
        <div 
          className={`transition-all duration-300 relative ${isBlocksCollapsed ? 'w-0 opacity-0 -ml-4' : 'w-64 opacity-100'}`}
          style={{ overflow: isBlocksCollapsed ? 'hidden' : 'visible' }}
        >
          <div className="bg-card rounded-lg p-4 shadow-sm h-full">
            <h3 className="font-medium mb-3">Content Blocks</h3>
            <div className="grid grid-cols-2 gap-3">
              <div 
                className="relative flex flex-col items-center justify-center p-3 border border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 cursor-move transition-colors"
                onClick={() => handleAddBlock('text')}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'text');
                  e.dataTransfer.effectAllowed = 'copy';
                  // Create ghost effect
                  const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                  ghost.style.position = 'absolute';
                  ghost.style.top = '-1000px';
                  ghost.style.opacity = '0.5';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
              >
                <div className="h-8 w-8 flex items-center justify-center rounded-md bg-blue-100 text-blue-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M17 6.1H3"/>
                    <path d="M21 12.1H3"/>
                    <path d="M15.1 18H3"/>
                  </svg>
                </div>
                <span className="text-sm font-medium">Text</span>
              </div>
              
              <div 
                className="relative flex flex-col items-center justify-center p-3 border border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 cursor-move transition-colors"
                onClick={() => handleAddBlock('image')}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'image');
                  e.dataTransfer.effectAllowed = 'copy';
                  // Create ghost effect
                  const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                  ghost.style.position = 'absolute';
                  ghost.style.top = '-1000px';
                  ghost.style.opacity = '0.5';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
              >
                <div className="h-8 w-8 flex items-center justify-center rounded-md bg-violet-100 text-violet-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2"/>
                    <circle cx="9" cy="9" r="2"/>
                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/>
                  </svg>
                </div>
                <span className="text-sm font-medium">Image</span>
              </div>
              
              <div 
                className="relative flex flex-col items-center justify-center p-3 border border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 cursor-move transition-colors"
                onClick={() => handleAddBlock('question')}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'question');
                  e.dataTransfer.effectAllowed = 'copy';
                  // Create ghost effect
                  const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                  ghost.style.position = 'absolute';
                  ghost.style.top = '-1000px';
                  ghost.style.opacity = '0.5';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
              >
                <div className="h-8 w-8 flex items-center justify-center rounded-md bg-amber-100 text-amber-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"/>
                    <path d="M12 17h.01"/>
                  </svg>
                </div>
                <span className="text-sm font-medium">Question</span>
              </div>
              
              <div 
                className="relative flex flex-col items-center justify-center p-3 border border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 cursor-move transition-colors"
                onClick={() => handleAddBlock('graph')}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'graph');
                  e.dataTransfer.effectAllowed = 'copy';
                  // Create ghost effect
                  const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                  ghost.style.position = 'absolute';
                  ghost.style.top = '-1000px';
                  ghost.style.opacity = '0.5';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
              >
                <div className="h-8 w-8 flex items-center justify-center rounded-md bg-green-100 text-green-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 3v18h18"/>
                    <path d="m19 9-5 5-4-4-3 3"/>
                  </svg>
                </div>
                <span className="text-sm font-medium">Graph</span>
              </div>
              
              <div 
                className="relative flex flex-col items-center justify-center p-3 border border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 cursor-move transition-colors"
                onClick={() => handleAddBlock('ai-chat')}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'ai-chat');
                  e.dataTransfer.effectAllowed = 'copy';
                  // Create ghost effect
                  const ghost = e.currentTarget.cloneNode(true) as HTMLElement;
                  ghost.style.position = 'absolute';
                  ghost.style.top = '-1000px';
                  ghost.style.opacity = '0.5';
                  document.body.appendChild(ghost);
                  e.dataTransfer.setDragImage(ghost, 0, 0);
                  setTimeout(() => document.body.removeChild(ghost), 0);
                }}
              >
                <div className="h-8 w-8 flex items-center justify-center rounded-md bg-purple-100 text-purple-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    <circle cx="12" cy="10" r="1"/>
                    <circle cx="8" cy="10" r="1"/>
                    <circle cx="16" cy="10" r="1"/>
                  </svg>
                </div>
                <span className="text-sm font-medium">AI Chat</span>
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-3 text-center">Drag and drop blocks directly into the editor</p>
          </div>
        </div>
        
        {/* Toggle button for content blocks panel */}
        <Button 
          variant="outline" 
          size="icon" 
          onClick={toggleBlocksPanel}
          className="h-8 w-8 self-start"
        >
          {isBlocksCollapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>

        {/* Main editor area - make it take remaining space */}
        <div className="flex-1">
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
      
      {/* Add Presentation Dialog */}
      {lessonId && (
        <PresentationDialog
          lessonId={lessonId}
          isOpen={isPresentationDialogOpen}
          onClose={() => setIsPresentationDialogOpen(false)}
          onCreateNewSession={handleCreateNewSession}
          onJoinExistingSession={handleJoinExistingSession}
        />
      )}
    </div>
  );
};

export default LessonEditor;
