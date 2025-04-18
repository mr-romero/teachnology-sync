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
import { analyzeQuestionImage } from '@/services/aiService';
import { uploadImage } from '@/services/imageService';
import LessonSlideView from '@/components/lesson/LessonSlideView';
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const LessonEditor: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeSlide, setActiveSlide] = useState<string>('');
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [lesson, setLesson] = useState<Lesson | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPresentationDialogOpen, setIsPresentationDialogOpen] = useState(false);
  const [isBlocksCollapsed, setIsBlocksCollapsed] = useState(false);
  const [copiedSlide, setCopiedSlide] = useState<LessonSlide | null>(null);
  const [llmOutput, setLlmOutput] = useState<string | null>(null); // For logging LLM output
  
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
            // Update URL without refreshing the page
            window.history.replaceState({}, '', `/editor/${newLesson.id}`);
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
            // Get stored state
            const storedData = localStorage.getItem('currentEditorState');
            if (storedData) {
              const { lessonId: storedLessonId, activeSlide: storedSlideId } = JSON.parse(storedData);
              if (storedLessonId === lessonId && fetchedLesson.slides.find(s => s.id === storedSlideId)) {
                setActiveSlide(storedSlideId);
              } else {
                setActiveSlide(fetchedLesson.slides[0].id);
              }
            } else {
              setActiveSlide(fetchedLesson.slides[0].id);
            }
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

  useEffect(() => {
    if (lessonId && activeSlide) {
      localStorage.setItem('currentEditorState', JSON.stringify({
        lessonId,
        activeSlide,
        selectedBlockId: selectedBlockId || null,
        timestamp: new Date().toISOString()
      }));
    }
  }, [lessonId, activeSlide, selectedBlockId]);

  // Enhanced state restoration from localStorage
  useEffect(() => {
    // Get active slide from localStorage when component mounts
    const storedData = localStorage.getItem('currentEditorState');
    if (storedData) {
      try {
        const { lessonId: storedLessonId, activeSlide: storedActiveSlide, selectedBlockId } = JSON.parse(storedData);
        if (storedLessonId === lessonId && lesson?.slides.find(s => s.id === storedActiveSlide)) {
          setActiveSlide(storedActiveSlide);
          if (selectedBlockId) {
            // Only restore block selection if the block still exists
            const slideWithBlock = lesson.slides.find(s => s.blocks.some(b => b.id === selectedBlockId));
            if (slideWithBlock) {
              setSelectedBlockId(selectedBlockId);
            }
          }
        }
      } catch (error) {
        console.error('Error restoring editor state:', error);
      }
    }
  }, [lessonId, lesson]);

  const handleLessonTitleChange = async (title: string) => {
    if (lesson) {
      const updatedLesson = {
        ...lesson,
        title,
        updatedAt: new Date().toISOString()
      };
      setLesson(updatedLesson);
      
      // Immediately save the title change
      try {
        await saveLesson(updatedLesson);
        toast.success('Lesson title updated');
      } catch (error) {
        console.error('Error saving lesson title:', error);
        toast.error('Failed to update lesson title');
      }
    }
  };

  const handleSlideChange = (slideId: string) => {
    setActiveSlide(slideId);
  };

  const handleAddSlide = () => {
    if (lesson) {
      const newSlideId = uuidv4();
      const blockId = `block-${Date.now()}`;
      const newSlide: LessonSlide = {
        id: newSlideId,
        title: `Slide ${lesson.slides.length + 1}`,
        blocks: [{
          id: blockId,
          type: 'feedback-question',
          questionText: 'Enter your question here',
          questionType: 'multiple-choice',
          options: ['Option 1', 'Option 2', 'Option 3'],
          correctAnswer: 'Option 1',
          feedbackInstructions: 'Ask me questions about this topic.',
          feedbackSystemPrompt: 'You are a helpful AI tutor. Provide encouraging and informative feedback on the student\'s answer. If they got it correct, explain why. If they got it wrong, guide them toward the correct understanding without directly giving the answer.',
          feedbackSentenceStarters: ['Can you explain why?', 'I need help with...', 'How did you get that?'],
          apiEndpoint: 'https://openrouter.ai/api/v1/chat/completions',
          modelName: 'mistralai/mistral-small-3.1-24b-instruct',
          optionStyle: 'A-D',
          repetitionPrevention: 'You should provide a direct answer to the question rather than repeating the prompt.',
          imageUrl: '',
          imageAlt: ''
        }],
        layout: {
          gridRows: 1,
          gridColumns: 1,
          blockPositions: {
            [blockId]: {
              row: 0,
              column: 0
            }
          }
        }
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

  const handleAddBlock = async (type: string) => {
    if (lesson) {
      const currentSlideIndex = lesson.slides.findIndex(slide => slide.id === activeSlide);
      
      if (currentSlideIndex === -1) return;

      // Get user's model settings
      const { data: { user } } = await supabase.auth.getUser();
      let modelSettings = {
        default_model: await getDefaultModel(),
        openrouter_endpoint: 'https://openrouter.ai/api/v1/chat/completions'
      };
      
      if (user?.id) {
        modelSettings = await getModelSettings(user.id);
      }
      
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
                visible: true
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
              allowPanning: true,
              allowZooming: true,
              showXAxis: true,
              showYAxis: true,
              xAxisLabel: '',
              yAxisLabel: '',
              backgroundColor: '#ffffff',
              showCalculator: true
            }
          };
          break;
        case 'ai-chat':
          newBlock = {
            id: `block-${Date.now()}`,
            type: 'ai-chat',
            instructions: 'Ask me questions about this topic.',
            sentenceStarters: ['What is...?', 'Can you explain...?', 'Why does...?'],
            apiEndpoint: modelSettings.openrouter_endpoint,
            modelName: modelSettings.default_model,
            systemPrompt: 'You are a helpful AI assistant for education. Help the student understand the topic while guiding them toward the correct understanding. Be encouraging and supportive.'
          };
          break;
        case 'feedback-question':
          newBlock = {
            id: `block-${Date.now()}`,
            type: 'feedback-question',
            questionText: 'Enter your question here',
            questionType: 'multiple-choice',
            options: ['Option 1', 'Option 2', 'Option 3'],
            correctAnswer: 'Option 1',
            feedbackInstructions: 'Ask for help if you need additional explanation.',
            feedbackSystemPrompt: 'You are a helpful AI tutor. Provide encouraging and informative feedback on the student\'s answer. If they got it correct, explain why. If they got it wrong, guide them toward the correct understanding without directly giving the answer.',
            feedbackSentenceStarters: ['Can you explain why?', 'I need help with...', 'How did you get that?'],
            modelName: modelSettings.default_model,
            apiEndpoint: modelSettings.openrouter_endpoint,
            imageUrl: '',
            imageAlt: ''
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

  // Handle image drop on feedback-question block
  const handleImageDropOnFeedbackBlock = async (imageUrl: string, imageAlt: string, blockId: string, slideId: string) => {
    if (lesson) {
      const currentSlide = lesson.slides.find(slide => slide.id === slideId);
      if (!currentSlide) return;
      
      const blockIndex = currentSlide.blocks.findIndex(block => block.id === blockId);
      if (blockIndex === -1) return;
      
      const block = currentSlide.blocks[blockIndex];
      if (block.type !== 'feedback-question') return;
      
      // First update the block with the image
      const updatedBlock = {
        ...block,
        imageUrl,
        imageAlt
      };
      
      // Update the lesson state with the image
      const updatedSlides = lesson.slides.map(slide => {
        if (slide.id === slideId) {
          const updatedBlocks = [...slide.blocks];
          updatedBlocks[blockIndex] = updatedBlock;
          return {
            ...slide,
            blocks: updatedBlocks
          };
        }
        return slide;
      });
      
      setLesson({
        ...lesson,
        slides: updatedSlides,
        updatedAt: new Date().toISOString()
      });
      
      // Log that image was added
      console.log('Image added to feedback block:', {
        blockId,
        imageUrl,
        slideId
      });
      
      try {
        // Show loading toast
        toast.loading('Analyzing image and generating question...');
        
        // Call the analyze image function from SlideWizard
        const result = await analyzeQuestionImage(imageUrl, updatedBlock.modelName);
        
        if (!result.questionText || !result.options || !result.correctAnswer) {
          throw new Error('Incomplete analysis results from LLM');
        }
        
        // Update the block with the LLM analysis results
        const blockWithAnalysis = {
          ...updatedBlock,
          questionText: result.questionText,
          options: result.options,
          correctAnswer: result.correctAnswer,
          questionType: 'multiple-choice' as const,
          optionStyle: result.optionStyle || 'A-D'
        };
        
        // Update the lesson state with the complete analysis
        const finalSlides = lesson.slides.map(slide => {
          if (slide.id === slideId) {
            const finalBlocks = [...slide.blocks];
            finalBlocks[blockIndex] = blockWithAnalysis;
            return {
              ...slide,
              blocks: finalBlocks
            };
          }
          return slide;
        });
        
        setLesson({
          ...lesson,
          slides: finalSlides,
          updatedAt: new Date().toISOString()
        });
        
        // Log LLM analysis results
        setLlmOutput(JSON.stringify(result, null, 2));
        console.log('LLM Output for Image Analysis:', result);
        
        toast.success('Question generated from image');
      } catch (error) {
        console.error('Error analyzing image:', error);
        toast.error(error instanceof Error ? error.message : 'Failed to analyze image');
      }
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
      case 'feedback-question':
        return (
          <div className="my-2 p-3 bg-indigo-50 rounded-md" 
            onDragOver={(e) => {
              e.preventDefault();
              e.currentTarget.classList.add('border-2', 'border-indigo-400');
            }}
            onDragLeave={(e) => {
              e.currentTarget.classList.remove('border-2', 'border-indigo-400');
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.currentTarget.classList.remove('border-2', 'border-indigo-400');
              
              // Process dropped files (images)
              if (e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                if (file.type.startsWith('image/')) {
                  handleDroppedFile(file, block.id, activeSlide);
                }
              }
            }}
          >
            <p className="font-medium mb-2">Feedback Question</p>
            {block.imageUrl && (
              <div className="mb-2">
                <img 
                  src={block.imageUrl} 
                  alt={block.imageAlt || 'Question image'} 
                  className="max-h-40 rounded"
                />
              </div>
            )}
            {!block.imageUrl && (
              <div className="border-2 border-dashed border-indigo-200 rounded-md p-4 text-center mb-2">
                <p className="text-sm text-indigo-500">Drag and drop an image here</p>
              </div>
            )}
            <p className="text-sm font-medium">{block.questionText}</p>
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
  const handleOpenPresentationDialog = async () => {
    if (lessonId === 'new' || !lesson) {
      // Save the lesson first
      try {
        const newLesson = await createLesson(user.id, lesson?.title || 'New Lesson');
        if (newLesson) {
          setLesson(newLesson);
          // Update URL without refreshing the page
          window.history.replaceState({}, '', `/editor/${newLesson.id}`);
          setIsPresentationDialogOpen(true);
          toast.success('Lesson saved before presenting');
        } else {
          toast.error('Failed to save lesson');
        }
      } catch (error) {
        console.error('Error saving lesson:', error);
        toast.error('Failed to save lesson');
      }
      return;
    }
    
    // For existing lessons, just open the dialog
    setIsPresentationDialogOpen(true);
  };

  // Handle creating a new presentation session
  const handleCreateNewSession = async (params?: { classroomId?: string }) => {
    if (lessonId) {
      navigate(`/teacher/presentation/${lessonId}?forceNew=true${params?.classroomId ? `&classroomId=${params.classroomId}` : ""}`);
    }
    return { sessionId: "redirecting", joinCode: "redirecting" };
  };

  // Handle joining an existing presentation session
  const handleJoinExistingSession = (sessionId: string) => {
    if (lessonId) {
      navigate(`/teacher/presentation/${lessonId}?sessionId=${sessionId}`);
    }
  };

  // Add a handler to preview as student
  const handlePreviewAsStudent = async () => {
    if (lessonId && lesson) {
      try {
        // Save the lesson before navigating to student view
        await saveLesson(lesson);
        // Navigate to student view with preview mode and current slide index
        const currentSlideIndex = lesson.slides.findIndex(slide => slide.id === activeSlide);
        navigate(`/student/view/${lessonId}?preview=true&slide=${currentSlideIndex}`);
      } catch (error) {
        console.error('Error saving lesson before preview:', error);
        toast.error("Failed to save lesson before preview");
      }
    }
  };

  // Toggle blocks panel collapsed state
  const toggleBlocksPanel = () => {
    setIsBlocksCollapsed(!isBlocksCollapsed);
  };

  const handleToggleCalculator = () => {
    if (lesson) {
      setLesson({
        ...lesson,
        settings: {
          ...lesson.settings,
          showCalculator: !(lesson.settings?.showCalculator ?? false)
        },
        updatedAt: new Date().toISOString()
      });
    }
  };

  // Add keyboard shortcut handler
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Only handle if we have a lesson loaded
      if (!lesson) return;
      
      // Check if Command (Mac) or Control (Windows) is pressed
      const isModifierKey = e.metaKey || e.ctrlKey;
      
      if (isModifierKey && e.key === 'c') {
        // Copy current slide
        const currentSlide = lesson.slides.find(slide => slide.id === activeSlide);
        if (currentSlide) {
          setCopiedSlide(currentSlide);
          // Optional: Show toast to indicate copy
          toast.success('Slide copied to clipboard');
        }
      } else if (isModifierKey && e.key === 'v' && copiedSlide) {
        // Paste slide
        const newSlide: LessonSlide = {
          ...copiedSlide,
          id: uuidv4(), // Generate new ID for the copy
          title: `${copiedSlide.title} (Copy)`,
          blocks: copiedSlide.blocks.map(block => ({
            ...block,
            id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
          }))
        };
        
        // Insert the new slide after the current slide
        const currentSlideIndex = lesson.slides.findIndex(slide => slide.id === activeSlide);
        const updatedSlides = [...lesson.slides];
        updatedSlides.splice(currentSlideIndex + 1, 0, newSlide);
        
        setLesson({
          ...lesson,
          slides: updatedSlides,
          updatedAt: new Date().toISOString()
        });
        
        // Set the new slide as active
        setActiveSlide(newSlide.id);
        
        // Optional: Show toast to indicate paste
        toast.success('Slide pasted');
      }
    };

    // Add event listener
    window.addEventListener('keydown', handleKeyboardShortcuts);

    // Clean up
    return () => {
      window.removeEventListener('keydown', handleKeyboardShortcuts);
    };
  }, [lesson, activeSlide, copiedSlide]);

  // Move handleDroppedFile inside component
  const handleDroppedFile = async (file: File, blockId: string, slideId: string) => {
    if (!user) return;
    
    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image file size must be less than 5MB");
      return;
    }

    try {
      // Show upload loading toast
      toast.loading('Uploading image...');
      
      // Upload to Supabase
      const result = await uploadImage(file, user.id);
      
      if ('error' in result) {
        throw new Error(result.error);
      }

      // Generate alt text from filename
      const suggestedAlt = file.name.split('.')[0].replace(/[_-]/g, ' ');
      
      // Process the uploaded image
      await handleImageDropOnFeedbackBlock(result.url, suggestedAlt, blockId, slideId);
      
      toast.success('Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(error instanceof Error ? error.message : 'Failed to upload image');
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
    <div className="container py-6">
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => navigate('/dashboard')}
            className="mr-2"
          >
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Dashboard
          </Button>
          <Input
            value={lesson?.title || ''}
            onChange={(e) => handleLessonTitleChange(e.target.value)}
            className="text-2xl font-bold bg-transparent border-0 border-b border-dashed focus-visible:ring-0 px-0 py-1 w-[300px]"
            placeholder="Enter lesson title"
          />
        </div>
        
        {/* Responsive layout for buttons */}
        <div className="flex flex-wrap gap-2 items-center justify-end">
          <div className="flex items-center gap-2">
            <Label htmlFor="showCalculator" className="text-sm whitespace-nowrap">Show Calculator</Label>
            <Switch 
              id="showCalculator" 
              checked={lesson?.settings?.showCalculator ?? false}
              onCheckedChange={handleToggleCalculator}
            />
          </div>
          
          <Button 
            variant="outline" 
            size="sm" 
            onClick={handlePreviewAsStudent}
            className="flex items-center whitespace-nowrap"
          >
            <Eye className="h-4 w-4 mr-1" />
            Student View
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleOpenPresentationDialog}
            className="flex items-center whitespace-nowrap"
          >
            <Play className="h-4 w-4 mr-1" />
            Present Lesson
          </Button>
          
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleSaveLesson}
            className="flex items-center whitespace-nowrap"
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
              
              {/* Feedback Question Block */}
              <div 
                className="relative flex flex-col items-center justify-center p-3 border border-gray-200 rounded-md hover:border-primary hover:bg-primary/5 cursor-move transition-colors"
                onClick={() => handleAddBlock('feedback-question')}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('text/plain', 'feedback-question');
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
                <div className="h-8 w-8 flex items-center justify-center rounded-md bg-indigo-100 text-indigo-600 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M8 12h8"/>
                    <path d="M12 16V8"/>
                    <path d="M8 16h.01"/>
                    <path d="M16 16h.01"/>
                  </svg>
                </div>
                <span className="text-sm font-medium">Feedback Q</span>
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
      
      {/* LLM Output Debug Panel */}
      {llmOutput && (
        <div className="mt-4 p-4 bg-gray-100 rounded-md">
          <div className="flex justify-between mb-2">
            <h3 className="font-medium">LLM Output</h3>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setLlmOutput(null)}
            >
              Close
            </Button>
          </div>
          <pre className="text-xs overflow-auto p-2 bg-white rounded border">{llmOutput}</pre>
        </div>
      )}
      
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
