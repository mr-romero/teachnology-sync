import React, { useState, useEffect } from 'react';
import { FeedbackQuestionBlock, QuestionType, MATH_FORMATTING_GUIDE } from '@/types/lesson';
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
import { Trash, Check, X, HelpCircle, Plus, Key, RefreshCw, Loader2 } from 'lucide-react';
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

interface FeedbackQuestionBlockEditorProps {
  block: FeedbackQuestionBlock;
  onUpdate: (updatedBlock: FeedbackQuestionBlock) => void;
  onDelete: () => void;
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
}) => {
  // Question state
  const [questionText, setQuestionText] = useState(block.questionText || 'Enter your question here');
  const [questionType, setQuestionType] = useState<QuestionType>(block.questionType || 'multiple-choice');
  const [options, setOptions] = useState<string[]>(block.options || ['Option 1', 'Option 2', 'Option 3']);
  const [correctAnswer, setCorrectAnswer] = useState<string | number | boolean | undefined>(block.correctAnswer);
  const [optionStyle, setOptionStyle] = useState<'A-D' | 'F-J' | 'text'>(block.optionStyle || 'A-D'); // Add option style state
  
  // Image state
  const [imageUrl, setImageUrl] = useState(block.imageUrl || '');
  const [imageAlt, setImageAlt] = useState(block.imageAlt || '');
  
  // AI Feedback state
  const [feedbackInstructions, setFeedbackInstructions] = useState(
    block.feedbackInstructions || 'Your AI tutor will help explain the answer.'
  );
  const [feedbackSystemPrompt, setFeedbackSystemPrompt] = useState(
    block.feedbackSystemPrompt || 'You are a helpful AI tutor. Provide encouraging feedback based on the student\'s answer. Explain why the answer is correct or incorrect, and provide additional context to enhance learning.'
  );
  const [sentenceStarters, setSentenceStarters] = useState<string[]>(
    block.feedbackSentenceStarters || ['Can you explain...?', 'Why is that...?', 'What about...?']
  );
  const [newStarter, setNewStarter] = useState('');
  const [apiEndpoint, setApiEndpoint] = useState(block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions');
  const [apiKey, setApiKey] = useState(block.apiKey || '');
  const [modelName, setModelName] = useState(block.modelName || 'openai/gpt-3.5-turbo');
  const [repetitionPrevention, setRepetitionPrevention] = useState(
    block.repetitionPrevention || "Provide concise feedback on the student's answer. Explain why it is correct or incorrect and provide further insights."
  );
  const [maxTokens, setMaxTokens] = useState(block.maxTokens || 500);
  const [includeMathFormatting, setIncludeMathFormatting] = useState(
    block.feedbackSystemPrompt?.includes('When responding with mathematical content') || false
  );
  
  // UI state
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [availableModels, setAvailableModels] = useState<ModelOption[]>([]);
  const [modelsFetched, setModelsFetched] = useState(false);
  const { toast } = useToast();
  
  const handleAddSentenceStarter = () => {
    if (newStarter.trim()) {
      setSentenceStarters([...sentenceStarters, newStarter.trim()]);
      setNewStarter('');
    }
  };
  
  const handleRemoveSentenceStarter = (index: number) => {
    const updatedStarters = [...sentenceStarters];
    updatedStarters.splice(index, 1);
    setSentenceStarters(updatedStarters);
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
      if (typeof correctAnswer !== 'boolean') {
        setCorrectAnswer(true);
      }
    } else {
      // For free response, we'll keep the correct answer as a string
      if (typeof correctAnswer === 'boolean') {
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
    if (apiKey && apiKey.length > 20 && !modelsFetched) {
      loadAvailableModels();
    }
  }, [apiKey]);
  
  // Function to load available models
  const loadAvailableModels = async () => {
    if (!apiKey || apiKey.length < 20) {
      toast({
        title: "API Key Required",
        description: "Please enter a valid API key to fetch available models",
        variant: "destructive"
      });
      return;
    }
    
    setIsLoadingModels(true);
    
    try {
      const models = await fetchAvailableModels(apiKey);
      
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
        modelName: 'openai/gpt-4',  // Default to GPT-4 for better image understanding
        maxTokens: 1000,  // Ensure enough tokens for detailed image analysis
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
      options: questionType === 'free-response' ? undefined : options,
      correctAnswer,
      optionStyle, // Include option style in the updated block
      imageUrl,
      imageAlt,
      feedbackInstructions,
      feedbackSystemPrompt,
      feedbackSentenceStarters: sentenceStarters,
      apiEndpoint,
      apiKey,
      modelName,
      repetitionPrevention,
      maxTokens
    };
    
    onUpdate(updatedBlock);
  }, [
    questionText,
    questionType,
    options,
    correctAnswer,
    optionStyle, // Add option style to dependency array
    imageUrl,
    imageAlt,
    feedbackInstructions,
    feedbackSystemPrompt,
    sentenceStarters,
    apiEndpoint,
    apiKey,
    modelName,
    repetitionPrevention,
    maxTokens
  ]);
  
  return (
    <Card className="border shadow-sm">
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-medium text-lg">Feedback Question Block</h3>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={onDelete}
          >
            <Trash className="h-4 w-4 mr-1" />
            Delete
          </Button>
        </div>
        
        <Tabs defaultValue="question">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="question">Question</TabsTrigger>
            <TabsTrigger value="image">Image (Optional)</TabsTrigger>
            <TabsTrigger value="feedback">AI Feedback</TabsTrigger>
          </TabsList>
          
          {/* Question Tab */}
          <TabsContent value="question" className="space-y-4 py-4">
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
                  
                  <Label>Options</Label>
                  {options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex-grow flex items-center space-x-2">
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
          <TabsContent value="image" className="space-y-4 py-4">
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
          <TabsContent value="feedback" className="space-y-4 py-4">
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
                      {sentenceStarters.map((starter, index) => (
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
                    <Label htmlFor="apiKey">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="apiKey"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        type="password"
                        placeholder="Enter your API key..."
                        className="flex-1"
                      />
                      <Button 
                        variant="outline" 
                        size="icon"
                        onClick={loadAvailableModels}
                        disabled={isLoadingModels || !apiKey || apiKey.length < 20}
                      >
                        {isLoadingModels ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <RefreshCw className="h-4 w-4" />
                        )}
                      </Button>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="outline" size="icon">
                              <Key className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-md">
                            <div className="space-y-2">
                              <p className="font-semibold text-destructive">Security Warning</p>
                              <p>This API key will be stored with the lesson and sent to students when they access this AI Chat block.</p>
                              <p>Consider using a restricted API key with usage limits.</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <Alert variant="destructive" className="mt-3">
                      <AlertTitle>Security Notice</AlertTitle>
                      <AlertDescription>
                        <p className="mb-1">The API key will be visible to students using this lesson. This is not using localStorage, but will be stored in the lesson data.</p>
                        <p>For security, consider:</p>
                        <ul className="list-disc list-inside text-sm space-y-1 mt-1">
                          <li>Using a restricted API key with rate and usage limits</li>
                          <li>Rotating the API key periodically</li>
                          <li>Setting spending caps in your API provider dashboard</li>
                        </ul>
                      </AlertDescription>
                    </Alert>
                  </div>
                  
                  <div>
                    <Label htmlFor="modelName">Model Name</Label>
                    {availableModels.length > 0 ? (
                      <Select
                        value={modelName}
                        onValueChange={setModelName}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a model" />
                        </SelectTrigger>
                        <SelectContent className="max-h-80">
                          {availableModels.map((model) => (
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
                    ) : (
                      <div className="mt-2 mb-4">
                        <Button 
                          variant="outline" 
                          className="w-full" 
                          onClick={loadAvailableModels}
                          disabled={isLoadingModels || !apiKey || apiKey.length < 20}
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
                          Enter your API key above and click this button to fetch available models.
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
                      <Label htmlFor="maxTokens">Maximum Response Length (tokens)</Label>
                      <TooltipProvider>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-6 w-6">
                              <HelpCircle className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent className="max-w-sm">
                            <p>
                              Limits the length of AI responses. Lower values can help prevent repetition and keep answers concise.
                              Recommended range: 200-1000 tokens.
                            </p>
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </div>
                    <div className="flex items-center gap-2">
                      <Slider 
                        id="maxTokens"
                        value={[maxTokens]} 
                        onValueChange={(value) => setMaxTokens(value[0])}
                        min={100}
                        max={2000}
                        step={50}
                        className="flex-1"
                      />
                      <Input 
                        type="number" 
                        value={maxTokens} 
                        onChange={(e) => setMaxTokens(Number(e.target.value))}
                        className="w-20"
                        min={100}
                        max={2000}
                      />
                    </div>
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
  );
};

export default FeedbackQuestionBlockEditor;