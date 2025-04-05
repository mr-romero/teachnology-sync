import React, { useState, useEffect } from 'react';
import { LessonBlock, FeedbackQuestionBlock, QuestionType, MATH_FORMATTING_GUIDE } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Trash, Check, X, HelpCircle, Plus, Key, RefreshCw, Loader2, MoveVertical, Wand2 } from 'lucide-react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Badge } from '@/components/ui/badge';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle,
  CardDescription,
  CardFooter 
} from '@/components/ui/card';
import { fetchAvailableModels } from '@/services/aiService';
import ImageUploader from './ImageUploader';
import { deleteImage } from '@/services/imageService';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { useToast } from '@/components/ui/use-toast';
import { Slider } from '@/components/ui/slider';
import FeedbackBlockSplitter from './FeedbackBlockSplitter';
import SlideWizard from './SlideWizard';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const STORAGE_KEY_PREFIX = 'feedback_question_editor_';

interface FeedbackQuestionBlockEditorProps {
  block: FeedbackQuestionBlock;
  onUpdate: (updatedBlock: LessonBlock) => void;
  onDelete: () => void;
  previewMode?: boolean;
}

interface ModelOption {
  id: string;
  name: string;
  context_length?: number;
  pricing?: any;
}

const FeedbackQuestionBlockEditor: React.FC<FeedbackQuestionBlockEditorProps> = ({
  block,
  onUpdate,
  onDelete
}): JSX.Element => {  // Add explicit return type
  // Load saved state or use defaults
  const loadSavedState = (key: string, defaultValue: any) => {
    try {
      const saved = sessionStorage.getItem(`${STORAGE_KEY_PREFIX}${block.id}_${key}`);
      return saved ? JSON.parse(saved) : defaultValue;
    } catch (err) {
      console.error('Error loading saved state:', err);
      return defaultValue;
    }
  };

  // Question state
  const [questionText, setQuestionText] = useState(() => 
    loadSavedState('questionText', block.questionText || 'Enter your question here')
  );
  const [questionType, setQuestionType] = useState(() => 
    loadSavedState('questionType', block.questionType || 'multiple-choice')
  );
  const [options, setOptions] = useState(() => 
    loadSavedState('options', block.options || ['Option 1', 'Option 2', 'Option 3'])
  );
  const [correctAnswer, setCorrectAnswer] = useState(() => 
    loadSavedState('correctAnswer', block.correctAnswer || '')
  );
  const [optionStyle, setOptionStyle] = useState(() => 
    loadSavedState('optionStyle', block.optionStyle || 'A-D')
  );
  const [allowAnswerChange, setAllowAnswerChange] = useState(() => 
    loadSavedState('allowAnswerChange', block.allowAnswerChange || false)
  );
  const [allowMultipleAnswers, setAllowMultipleAnswers] = useState(() => 
    loadSavedState('allowMultipleAnswers', block.allowMultipleAnswers || false)
  );

  // Image state
  const [imageUrl, setImageUrl] = useState(() => 
    loadSavedState('imageUrl', block.imageUrl || '')
  );
  const [imageAlt, setImageAlt] = useState(() => 
    loadSavedState('imageAlt', block.imageAlt || '')
  );
  
  // AI Feedback state
  const [feedbackInstructions, setFeedbackInstructions] = useState(() => 
    loadSavedState('feedbackInstructions', block.feedbackInstructions || 'Your AI tutor will help explain the answer.')
  );
  const [feedbackSystemPrompt, setFeedbackSystemPrompt] = useState(() => 
    loadSavedState('feedbackSystemPrompt', block.feedbackSystemPrompt || `You are a helpful AI assistant for education. Help the student understand the topic while guiding them toward the correct understanding.

When responding with mathematical content:
- Use \\( and \\) for inline math expressions
- Use \\[ and \\] for displayed math expressions
- Format equations and mathematical symbols properly
- Be consistent with LaTeX notation throughout the response`)
  );
  const [feedbackSentenceStarters, setFeedbackSentenceStarters] = useState(() => 
    loadSavedState('feedbackSentenceStarters', block.feedbackSentenceStarters || ['Can you explain...?', 'Why is that...?', 'What about...?'])
  );
  const [newStarter, setNewStarter] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState(() => 
    loadSavedState('apiEndpoint', block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions')
  );
  const [modelSearch, setModelSearch] = useState('');
  const [modelName, setModelName] = useState(() => 
    loadSavedState('modelName', block.modelName || 'mistralai/mistral-small-3.1-24b-instruct:free')
  );
  const [repetitionPrevention, setRepetitionPrevention] = useState(() => 
    loadSavedState('repetitionPrevention', block.repetitionPrevention || "Provide concise feedback on the student's answer. Explain why it is correct or incorrect and provide further insights.")
  );
  const [includeMathFormatting, setIncludeMathFormatting] = useState(
    block.feedbackSystemPrompt?.includes('When responding with mathematical content') || false
  );
  
  // UI state
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelsFetched, setModelsFetched] = useState(false);
  const { toast } = useToast();
  const [expanded, setExpanded] = useState(true);

  // Don't show split option if this is already a split block
  const showSplitOption = !block.displayMode && !block.isGrouped;
  
  const handleAddSentenceStarter = () => {
    if (newStarter.trim()) {
      setFeedbackSentenceStarters(prev => [...prev, newStarter.trim()]);
      setNewStarter('');
    }
  };
  
  const handleRemoveSentenceStarter = (index: number) => {
    setFeedbackSentenceStarters(prev => prev.filter((_, i) => i !== index));
  };
  
  const updateQuestionType = (type: QuestionType) => {
    setQuestionType(type);
    
    // Reset properties based on type
    if (type === 'multiple-choice') {
      setOptions(options.length ? options : ['Option 1', 'Option 2', 'Option 3']);
      if (typeof correctAnswer === 'boolean') {
        setCorrectAnswer(options[0] || 'Option 1');
      }
    } else if (type === 'true-false') {
      setOptions(['True', 'False']);
      if (Array.isArray(correctAnswer) || typeof correctAnswer !== 'boolean') {
        setCorrectAnswer(true);
      }
    } else {
      // For free response, we'll keep the correct answer as a string
      if (typeof correctAnswer === 'boolean' || Array.isArray(correctAnswer)) {
        setCorrectAnswer('');
      }
    }
  };
  
  const handleImageUploaded = (url: string, path: string) => {
    // If there's an existing image in storage and we're replacing it, clean up the old one
    if (block.imageStoragePath && path && block.imageStoragePath !== path) {
      // We don't need to await this, it can happen in the background
      deleteImage(block.imageStoragePath).catch(err => 
        console.error('Error deleting old image:', err)
      );
    }
    
    setImageUrl(url);
    setImageAlt(imageAlt); // Ensure alt text persists
    
    // Update the block immediately so it persists when switching tabs
    onUpdate({
      ...block,
      imageUrl: url,
      imageAlt: imageAlt, // Make sure alt text is included
      imageStoragePath: path
    });
  };
  
  const handleUpdateAlt = (alt: string) => {
    setImageAlt(alt);
    
    // Update the block with the new alt text
    onUpdate({
      ...block,
      imageAlt: alt
    });
  };

  const addOption = () => {
    setOptions([...options, `Option ${options.length + 1}`]);
  };
  
  const updateOption = (index: number, value: string) => {
    const updatedOptions = [...options];
    updatedOptions[index] = value;
    setOptions(updatedOptions);
    
    // If the updated option was the correct answer, update the correct answer too
    if (options[index] === correctAnswer) {
      setCorrectAnswer(value);
    }
  };
  
  const removeOption = (index: number) => {
    if (options.length > 2) {
      // If we're removing the correct answer, reset it
      if (options[index] === correctAnswer) {
        setCorrectAnswer(options[0] === options[index] ? options[1] : options[0]);
      }
      
      const updatedOptions = options.filter((_, i) => i !== index);
      setOptions(updatedOptions);
    }
  };
  
  // Update system prompt with math formatting when toggled
  useEffect(() => {
    let updatedPrompt = feedbackSystemPrompt;
    
    if (includeMathFormatting) {
      // Only add if not already present
      if (!feedbackSystemPrompt.includes('When responding with mathematical content')) {
        updatedPrompt = `${feedbackSystemPrompt}\n\n${MATH_FORMATTING_GUIDE}`;
        setFeedbackSystemPrompt(updatedPrompt);
      }
    } else {
      // Remove math formatting guide if present
      if (feedbackSystemPrompt.includes('When responding with mathematical content')) {
        updatedPrompt = feedbackSystemPrompt.replace(MATH_FORMATTING_GUIDE, '').trim();
        setFeedbackSystemPrompt(updatedPrompt);
      }
    }
  }, [includeMathFormatting]);
  
  // Load available models when API key is provided
  useEffect(() => {
    if (!modelsFetched) {
      loadAvailableModels();
    }
  }, []);
  
  // Function to load available models
  const loadAvailableModels = async () => {
    setIsLoadingModels(true);
    
    try {
      const models = await fetchAvailableModels();
      
      if (models && models.length > 0) {
        setAvailableModels(models);
        setModelsFetched(true);
        toast({
          title: "Models Loaded",
          description: `Successfully loaded ${models.length} available models`,
        });
      } else {
        toast({
          title: "Error Loading Models",
          description: "Could not fetch available models. Please check your API key and try again.",
          variant: "destructive"
        });
      }
    } catch (error) {
      console.error("Error fetching models:", error);
      toast({
        title: "Error Loading Models",
        description: "An error occurred while fetching models. Please check your API key and try again.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingModels(false);
    }
  };

  // Default sentence starters based on question type and whether there's an image
  const getDefaultSentenceStarters = () => {
    const baseStarters = [
      "Can you explain this step by step?",
      "I'm confused about...",
      "Could you break this down?",
      "How did you arrive at that answer?"
    ];

    // Add visual/mathematical specific starters if there's an image
    if (block.imageUrl) {
      return [
        ...baseStarters,
        "Can you explain what this diagram/image shows?",
        "I don't understand this part of the visualization...",
        "How does this visual representation help solve the problem?",
        "Could you walk me through the elements in the image?",
        "What's the significance of this part in the diagram?"
      ];
    }

    return baseStarters;
  };

  // Initialize sentence starters
  useEffect(() => {
    if (!block.feedbackSentenceStarters || block.feedbackSentenceStarters.length === 0) {
      const defaultStarters = getDefaultSentenceStarters();
      onUpdate({
        ...block,
        feedbackSentenceStarters: defaultStarters
      });
    }
  }, [block.imageUrl]);
  
  // Initialize model settings with GPT-4 by default for better image handling
  useEffect(() => {
    if (!block.modelName) {
      onUpdate({
        ...block,
        modelName: 'mistralai/mistral-small-3.1-24b-instruct:free',  // Default to free Mistral model
        feedbackSystemPrompt: `You are a helpful mathematics tutor providing feedback on a student's answer.

${block.imageUrl ? `When analyzing this problem:
- The question includes a visual/mathematical image that is essential for understanding
- You must reference specific elements from the image in your explanations
- Use the visual elements to help explain concepts
- Be precise when referring to parts of the image
- Use proper LaTeX notation for mathematical expressions` : ''}

Provide clear, encouraging feedback that:
1. Acknowledges whether the answer is correct or incorrect
2. Explains the reasoning using clear mathematical concepts
3. Offers step-by-step guidance when needed
4. Uses visual references when available
5. Encourages deeper understanding of the concepts

Remember to:
- Be encouraging and supportive
- Use clear mathematical notation
- Reference visual elements when available
- Guide students through their thought process`
      });
    }
  }, [block.imageUrl]);

  // Update the block whenever state changes
  useEffect(() => {
    const updatedBlock: FeedbackQuestionBlock = {
      ...block,
      questionText,
      questionType,
      options,
      correctAnswer,
      optionStyle,
      allowAnswerChange,
      allowMultipleAnswers,
      feedbackInstructions,
      feedbackSystemPrompt,
      feedbackSentenceStarters,
      apiEndpoint,
      modelName,
      repetitionPrevention,
      imageUrl,
      imageAlt
    };
    onUpdate(updatedBlock);
  }, [
    questionText,
    questionType,
    options,
    correctAnswer,
    optionStyle,
    allowAnswerChange,
    allowMultipleAnswers,
    feedbackInstructions,
    feedbackSystemPrompt,
    feedbackSentenceStarters,
    apiEndpoint,
    modelName,
    repetitionPrevention,
    imageUrl,
    imageAlt
  ]);

  // Save state when it changes
  useEffect(() => {
    const saveState = (key: string, value: any) => {
      try {
        sessionStorage.setItem(`${STORAGE_KEY_PREFIX}${block.id}_${key}`, JSON.stringify(value));
      } catch (err) {
        console.error('Error saving state:', err);
      }
    };

    // Save all form fields
    saveState('questionText', questionText);
    saveState('questionType', questionType);
    saveState('options', options);
    saveState('correctAnswer', correctAnswer);
    saveState('optionStyle', optionStyle);
    saveState('allowAnswerChange', allowAnswerChange);
    saveState('allowMultipleAnswers', allowMultipleAnswers);
    saveState('feedbackInstructions', feedbackInstructions);
    saveState('feedbackSystemPrompt', feedbackSystemPrompt);
    saveState('feedbackSentenceStarters', feedbackSentenceStarters);
    saveState('apiEndpoint', apiEndpoint);
    saveState('modelName', modelName);
    saveState('repetitionPrevention', repetitionPrevention);
    saveState('imageUrl', imageUrl);
    saveState('imageAlt', imageAlt);
  }, [
    block.id,
    questionText,
    questionType,
    options,
    correctAnswer,
    optionStyle,
    allowAnswerChange,
    allowMultipleAnswers,
    feedbackInstructions,
    feedbackSystemPrompt,
    feedbackSentenceStarters,
    apiEndpoint,
    modelName,
    repetitionPrevention,
    imageUrl,
    imageAlt
  ]);

  // Clean up storage when component unmounts
  useEffect(() => {
    // Store cleanup function in window to handle page unloads
    const cleanupKey = `cleanup_${block.id}`;
    window[cleanupKey] = () => {
      const keys = [
        'questionText', 'questionType', 'options', 'correctAnswer', 'optionStyle',
        'allowAnswerChange', 'allowMultipleAnswers', 'feedbackInstructions',
        'feedbackSystemPrompt', 'feedbackSentenceStarters', 'apiEndpoint',
        'modelName', 'repetitionPrevention', 'imageUrl', 'imageAlt'
      ];
      
      keys.forEach(key => {
        sessionStorage.removeItem(`${STORAGE_KEY_PREFIX}${block.id}_${key}`);
      });
    };

    // Add unload listener
    window.addEventListener('beforeunload', window[cleanupKey]);

    return () => {
      window.removeEventListener('beforeunload', window[cleanupKey]);
      delete window[cleanupKey];
    };
  }, [block.id]);

  // Add new state for wizard dialog
  const [wizardOpen, setWizardOpen] = useState(false);

  const handleWizardComplete = (result: {
    questionText: string;
    options?: string[];
    correctAnswer?: string;
    optionStyle?: 'A-D' | 'F-J' | 'text';
    imageUrl: string;
    imageAlt: string;
  }) => {
    // Update all relevant state
    setQuestionText(result.questionText);
    if (result.options && result.options.length > 0) {
      setQuestionType('multiple-choice');
      setOptions(result.options);
      setOptionStyle('A-D'); // Set the default option style to A-D
      if (result.correctAnswer) {
        setCorrectAnswer(result.correctAnswer);
      }
    }
    setImageUrl(result.imageUrl);
    setImageAlt(result.imageAlt);
    setWizardOpen(false);
  };

  return (
    <>
      <Card className="border shadow-sm min-w-[300px] min-h-[400px]">
        <CardContent className="p-4 flex flex-col gap-4 h-full">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-medium text-lg">Feedback Question Block</h3>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setWizardOpen(true)}
                className="gap-2"
              >
                <Wand2 className="h-4 w-4" />
                Wizard
              </Button>
              <Button 
                variant="destructive" 
                size="sm" 
                onClick={onDelete}
              >
                <Trash className="h-4 w-4 mr-1" />
                Delete
              </Button>
            </div>
          </div>
          
          <Tabs defaultValue="question">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="question">Question</TabsTrigger>
              <TabsTrigger value="image">Image (Optional)</TabsTrigger>
              <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
            </TabsList>
            
            {/* Question Tab */}
            <TabsContent value="question" className="space-y-4 py-4 h-[calc(400px-80px)] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label>Question Type</Label>
                  <Select
                    value={questionType}
                    onValueChange={(value) => updateQuestionType(value as QuestionType)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple-choice">Multiple Choice</SelectItem>
                      <SelectItem value="free-response">Free Response</SelectItem>
                      <SelectItem value="true-false">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label>Question Text</Label>
                  <Textarea
                    value={questionText}
                    onChange={(e) => setQuestionText(e.target.value)}
                    placeholder="Enter your question here"
                    className="min-h-[100px] mt-1"
                  />
                </div>
                
                {questionType === 'multiple-choice' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Option Style</Label>
                      <Select
                        value={optionStyle}
                        onValueChange={(value: 'A-D' | 'F-J' | 'text') => setOptionStyle(value)}
                      >
                        <SelectTrigger className="mt-1">
                          <SelectValue placeholder="Select option style" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="A-D">A, B, C, D</SelectItem>
                          <SelectItem value="F-J">F, G, H, I, J</SelectItem>
                          <SelectItem value="text">Plain Text</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose how multiple choice options will be labeled for students.
                      </p>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="flex items-center space-x-2 pt-2">
                        <Switch
                          id="allowMultipleAnswers"
                          checked={allowMultipleAnswers}
                          onCheckedChange={setAllowMultipleAnswers}
                        />
                        <Label htmlFor="allowMultipleAnswers">Allow multiple correct answers</Label>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        When enabled, students can select multiple options and you can mark multiple answers as correct.
                      </p>
                    </div>
                    
                    <div className="flex items-center space-x-2 pt-2">
                      <Switch
                        id="allowAnswerChange"
                        checked={allowAnswerChange}
                        onCheckedChange={setAllowAnswerChange}
                      />
                      <Label htmlFor="allowAnswerChange">Allow answer changes after submission</Label>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      When enabled, students can change their answers after submitting. By default, answers are locked after submission.
                    </p>
                    
                    <Label>Options</Label>
                    {options.map((option, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <div className="flex-grow flex items-center space-x-2">
                          {allowMultipleAnswers ? (
                            <input
                              type="checkbox"
                              className="h-4 w-4 rounded border-gray-300 focus:ring-primary"
                              checked={Array.isArray(correctAnswer) ? correctAnswer.includes(option) : correctAnswer === option}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  // Add to correct answers array
                                  const newCorrectAnswers = Array.isArray(correctAnswer) 
                                    ? [...correctAnswer, option]
                                    : [option];
                                  setCorrectAnswer(newCorrectAnswers);
                                } else {
                                  // Remove from correct answers array
                                  if (Array.isArray(correctAnswer)) {
                                    setCorrectAnswer(correctAnswer.filter(answer => answer !== option));
                                  }
                                }
                              }}
                            />
                          ) : (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 rounded-full"
                              onClick={() => setCorrectAnswer(option)}
                            >
                              {correctAnswer === option ? (
                                <Check className="h-3 w-3 text-primary" />
                              ) : (
                                <div className="h-3 w-3 rounded-full border-2" />
                              )}
                            </Button>
                          )}
                          <span className="w-6 text-muted-foreground text-sm">
                            {optionStyle === 'A-D' 
                              ? String.fromCharCode(65 + index) 
                              : optionStyle === 'F-J' 
                                ? String.fromCharCode(70 + index)
                                : ''}
                          </span>
                          <Input
                            value={option}
                            onChange={(e) => updateOption(index, e.target.value)}
                            className="flex-grow"
                          />
                        </div>
                        {options.length > 2 && (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => removeOption(index)}
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    ))}
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addOption}
                      className="mt-2"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Add Option
                    </Button>
                  </div>
                )}
                
                {questionType === 'true-false' && (
                  <div className="space-y-3">
                    <Label>Correct Answer</Label>
                    <div className="flex space-x-4">
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setCorrectAnswer(true)}
                        >
                          {correctAnswer === true ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border-2" />
                          )}
                        </Button>
                        <span>True</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 rounded-full"
                          onClick={() => setCorrectAnswer(false)}
                        >
                          {correctAnswer === false ? (
                            <Check className="h-3 w-3 text-primary" />
                          ) : (
                            <div className="h-3 w-3 rounded-full border-2" />
                          )}
                        </Button>
                        <span>False</span>
                      </div>
                    </div>
                  </div>
                )}
                
                {questionType === 'free-response' && (
                  <div className="space-y-3">
                    <div>
                      <Label>Sample Answer (for reference)</Label>
                      <Textarea
                        value={typeof correctAnswer === 'string' ? correctAnswer : ''}
                        onChange={(e) => setCorrectAnswer(e.target.value)}
                        placeholder="Enter a sample answer"
                        className="min-h-[100px] mt-1"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Image Tab */}
            <TabsContent value="image" className="space-y-4 py-4 h-[calc(400px-80px)] overflow-y-auto">
              <div className="space-y-4">
                <div>
                  <Label>Image (Optional)</Label>
                  <div className="mt-2">
                    <ImageUploader 
                      onImageUploaded={handleImageUploaded}
                      existingUrl={imageUrl}
                      existingAlt={imageAlt}
                      onUpdateAlt={handleUpdateAlt}
                    />
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="imageAlt">Alt Text (for accessibility)</Label>
                  <Input
                    id="imageAlt"
                    value={imageAlt}
                    onChange={(e) => setImageAlt(e.target.value)}
                    placeholder="Describe the image for screen readers"
                    className="mt-1"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Describe what's in the image to make it accessible to users with visual impairments.
                  </p>
                </div>

                {imageUrl && (
                  <div className="mt-4">
                    <Label>Image Preview</Label>
                    <div className="mt-2 border rounded-md p-4 flex justify-center">
                      <img 
                        src={imageUrl} 
                        alt={imageAlt || "Preview"} 
                        className="max-h-48 object-contain"
                      />
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>
            
            {/* Feedback Tab */}
            <TabsContent value="feedback" className="space-y-4 py-4 h-[calc(400px-80px)] overflow-y-auto">
              <Tabs defaultValue="content">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="content">Content</TabsTrigger>
                  <TabsTrigger value="api">API Settings</TabsTrigger>
                  <TabsTrigger value="advanced">Advanced</TabsTrigger>
                </TabsList>
                
                {/* Content Tab */}
                <TabsContent value="content" className="space-y-4 py-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="feedbackInstructions">Instructions for Students</Label>
                      <Textarea
                        id="feedbackInstructions"
                        value={feedbackInstructions}
                        onChange={(e) => setFeedbackInstructions(e.target.value)}
                        placeholder="Enter instructions for students..."
                        className="min-h-[100px]"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        These instructions will be shown to students above the feedback chat interface.
                      </p>
                    </div>
                    
                    <div>
                      <Label>Sentence Starters</Label>
                      <div className="flex flex-wrap gap-2 mt-2 mb-3">
                        {feedbackSentenceStarters.map((starter, index) => (
                          <Badge key={index} variant="secondary" className="px-2 py-1 flex items-center gap-1">
                            {starter}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-4 w-4 rounded-full"
                              onClick={() => handleRemoveSentenceStarter(index)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                      <div className="flex gap-2">
                        <Input
                          value={newStarter}
                          onChange={(e) => setNewStarter(e.target.value)}
                          placeholder="Add a sentence starter..."
                          className="flex-1"
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddSentenceStarter();
                            }
                          }}
                        />
                        <Button onClick={handleAddSentenceStarter} size="sm">
                          <Plus className="h-4 w-4 mr-1" />
                          Add
                        </Button>
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        These will appear as buttons that students can click to start their message.
                      </p>
                    </div>
                  </div>
                </TabsContent>
                
                {/* API Settings Tab */}
                <TabsContent value="api" className="space-y-4 py-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="apiEndpoint">API Endpoint</Label>
                      <Input
                        id="apiEndpoint"
                        value={apiEndpoint}
                        onChange={(e) => setApiEndpoint(e.target.value)}
                        placeholder="https://openrouter.ai/api/v1/chat/completions"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        Default: OpenRouter.ai. Change to use a different provider like OpenAI.
                      </p>
                    </div>
                    
                    <div>
                      <Label htmlFor="modelName">Model Name</Label>
                      {availableModels.length > 0 ? (
                        <div className="space-y-2">
                          <Input
                            placeholder="Search models..."
                            value={modelSearch}
                            onChange={(e) => setModelSearch(e.target.value)}
                            className="mb-2"
                          />
                          <Select
                            value={modelName}
                            onValueChange={setModelName}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select a model" />
                            </SelectTrigger>
                            <SelectContent className="max-h-80">
                              {availableModels.filter(model => 
                                model.name.toLowerCase().includes(modelSearch.toLowerCase()) ||
                                model.id.toLowerCase().includes(modelSearch.toLowerCase())
                              ).map((model) => (
                                <SelectItem key={model.id} value={model.id}>
                                  <div className="flex items-center gap-2">
                                    <span>{model.name}</span>
                                    {model.context_length && (
                                      <Badge variant="outline" className="ml-1 text-xs">
                                        {Math.round(model.context_length / 1000)}k ctx
                                      </Badge>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      ) : (
                        <div className="mt-2 mb-4">
                          <Button 
                            variant="outline" 
                            className="w-full" 
                            onClick={loadAvailableModels}
                            disabled={isLoadingModels}
                          >
                            {isLoadingModels ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                Loading available models...
                              </>
                            ) : (
                              <>
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Fetch available models
                              </>
                            )}
                          </Button>
                          <p className="text-xs text-muted-foreground mt-2">
                            Click to fetch available models. Make sure you have set your API key in Settings.
                          </p>
                        </div>
                      )}
                      {!modelsFetched && modelName && (
                        <div className="mt-2">
                          <Alert className="bg-amber-50 border-amber-200">
                            <p className="text-amber-700 text-sm">
                              Currently using: <span className="font-semibold">{modelName}</span>
                            </p>
                          </Alert>
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
                
                {/* Advanced Tab */}
                <TabsContent value="advanced" className="space-y-4 py-4">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="feedbackSystemPrompt">System Prompt</Label>
                      <Textarea
                        id="feedbackSystemPrompt"
                        value={feedbackSystemPrompt}
                        onChange={(e) => setFeedbackSystemPrompt(e.target.value)}
                        placeholder="Enter system prompt for the AI..."
                        className="min-h-[200px]"
                      />
                      <p className="text-sm text-muted-foreground mt-1">
                        The system prompt tells the AI how to behave. For this feedback block, it should explain how to evaluate student answers.
                      </p>
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="repetitionPrevention">Anti-Repetition Instructions</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>
                                This instruction will be added to the system prompt to help prevent the AI 
                                from repeating the prompt back to the student. This is particularly useful for 
                                certain models that tend to be repetitive.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <Textarea
                        id="repetitionPrevention"
                        value={repetitionPrevention}
                        onChange={(e) => setRepetitionPrevention(e.target.value)}
                        placeholder="Add instructions to prevent the AI from repeating the prompt..."
                        className="min-h-[100px]"
                      />
                    </div>
                    
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <Label htmlFor="includeMathFormatting">Include Math Formatting</Label>
                        <TooltipProvider>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-6 w-6">
                                <HelpCircle className="h-4 w-4" />
                              </Button>
                            </TooltipTrigger>
                            <TooltipContent className="max-w-sm">
                              <p>
                                Toggle this option to include or exclude math formatting instructions in the system prompt.
                              </p>
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="includeMathFormatting"
                          checked={includeMathFormatting}
                          onChange={(e) => setIncludeMathFormatting(e.target.checked)}
                        />
                        <Label htmlFor="includeMathFormatting">Include Math Formatting Guide</Label>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        Enable this for math-related content to ensure proper LaTeX formatting in AI responses.
                      </p>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={wizardOpen} onOpenChange={setWizardOpen}>
        <DialogContent className="max-w-3xl">
          <SlideWizard
            onComplete={handleWizardComplete}
            onCancel={() => setWizardOpen(false)}
            model={modelName} // Pass the current model to the wizard
          />
        </DialogContent>
      </Dialog>
    </>
  );
};

export default FeedbackQuestionBlockEditor;
