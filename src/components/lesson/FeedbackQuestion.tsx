import React, { useState, useRef, useEffect, useCallback } from 'react';
import { FeedbackQuestionBlock } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Send, Sparkles, Loader2, Info, CheckCircle2, AlertTriangle, XCircle, HelpCircle, Volume2, VolumeX } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchChatCompletion } from '@/services/aiService';
import ReactMarkdown from 'react-markdown';
import ImageViewer from './ImageViewer';
import AIChat from './AIChat';  // Add AIChat import
import { cn } from '@/lib/utils';
import MathDisplay from './MathDisplay';
import CelebrationOverlay from './CelebrationOverlay';
import CelebrationConfigDialog from './CelebrationConfigDialog';
import { getCelebrationSettings, updateCelebrationSettings, CelebrationSettings, getDefaultModel } from '@/services/userSettingsService';
import { useAuth } from '@/context/AuthContext';
import { getUserSettings } from '@/services/userSettingsService';
import { supabase } from '@/integrations/supabase/client';
import { textToSpeech, getTTSSettings, saveTTSSettings } from '@/services/ttsService';
import { Badge } from '@/components/ui/badge';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Helper function to preprocess content
const preprocessContent = (content: string): string => {
  // Remove JSON blocks from the content
  const jsonRegex = /\{(?:[^{}]|\{[^{}]*\})*\}/g;
  content = content.replace(jsonRegex, '');

  // Convert explicit \n to line breaks while preserving paragraph structure
  content = content
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines to double newlines

  // Handle display math with proper spacing
  content = content
    .replace(/\$\$([^$]+?)\$\$/g, (_, math) => {
      const trimmedMath = math.trim();
      return '\n\n\\[' + trimmedMath + '\\]\n\n';
    });

  // Handle line breaks and spacing around sections
  content = content
    .replace(/([^\n])(Problem:|Steps:|Hint:|Steps to solve)/g, '$1\n\n$2')
    .replace(/(#{1,6}\s.*?)([^\n])/g, '$1\n$2')
    .replace(/([^\n])(\s*[-*+]\s)/g, '$1\n\n$2')
    .replace(/([^\n])(\s*\d+\.\s)/g, '$1\n\n$2')
    // Ensure consistent spacing
    .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
    .trim();

  return content;
}

// Helper function to parse latex expressions from markdown
const parseLatexExpressions = (text: string): { text: string, isLatex: boolean }[] => {
  const parts: { text: string, isLatex: boolean }[] = [];
  let currentText = '';
  let isInLatex = false;
  let i = 0;

  while (i < text.length) {
    if (text.slice(i, i + 2) === '\\[' || text.slice(i, i + 2) === '\\(') {
      if (currentText) {
        parts.push({ text: currentText, isLatex: false });
        currentText = '';
      }
      const closer = text.slice(i, i + 2) === '\\[' ? '\\]' : '\\)';
      const display = text.slice(i, i + 2) === '\\[';
      i += 2;
      let latex = '';
      while (i < text.length && text.slice(i, i + 2) !== closer) {
        latex += text[i];
        i++;
      }
      if (i < text.length) {
        parts.push({ text: latex, isLatex: true });
        i += 2;
      }
    } else {
      currentText += text[i];
      i++;
    }
  }
  
  if (currentText) {
    parts.push({ text: currentText, isLatex: false });
  }
  
  return parts;
};

// Update the MarkdownWithMath component to handle block and inline elements properly
const MarkdownWithMath = ({ content }: { content: string }) => {
  const parts = parseLatexExpressions(content);
  
  // Helper function to detect if text starts with block-level markdown
  const isBlockLevel = (text: string): boolean => {
    const blockPatterns = [
      /^#{1,6}\s/, // Headers
      /^\s*[-*+]\s/, // Unordered lists
      /^\s*\d+\.\s/, // Ordered lists
      /^\s*>.+/, // Blockquotes
      /^Problem:/, // Special case for "Problem:" keyword
      /^Steps:/, // Special case for "Steps:" keyword
      /^Hint:/, // Special case for "Hint:" keyword
      /^\s*\n/, // Empty lines
      /^Steps to solve/, // Special case for step instructions
    ];
    return blockPatterns.some(pattern => pattern.test(text.trimStart()));
  };

  return (
    <div className="prose prose-sm max-w-none space-y-4">
      {parts.map((part, index) => 
        part.isLatex ? (
          <span key={index} className="mx-0.5 inline-block align-middle">
            <MathDisplay latex={part.text} />
          </span>
        ) : (
          <span key={index} className="inline align-baseline">
            <ReactMarkdown components={{
              p: ({node, children, ...props}) => {
                const text = typeof children[0] === 'string' ? children[0] : '';
                return isBlockLevel(text) ? (
                  <p className="block mb-4" {...props}>{children}</p>
                ) : (
                  <span className="inline" {...props}>{children}</span>
                );
              },
              h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4 block" {...props} />,
              h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3 block" {...props} />,
              h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2 block" {...props} />,
              h4: ({node, ...props}) => <h4 className="text-base font-bold mt-3 mb-2 block" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc list-inside my-4 block space-y-2 pl-4" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal list-inside my-4 block space-y-2 pl-4" {...props} />,
              li: ({node, ...props}) => <li className="block mb-1" {...props} />,
              strong: ({node, ...props}) => <span className="font-semibold" {...props} />,
              em: ({node, ...props}) => <span className="italic" {...props} />,
              blockquote: ({node, ...props}) => (
                <blockquote className="border-l-2 border-gray-300 pl-4 my-4 block" {...props} />
              ),
              code: ({node, ...props}) => <code className="bg-muted rounded px-1" {...props} />,
            }}>
              {part.text}
            </ReactMarkdown>
          </span>
        )
      )}
    </div>
  );
};

// Define feedback evaluation types
export type FeedbackEvaluation = 'strong' | 'partial' | 'misconception' | 'needs-detail' | null;

// Add StatusIndicator component for displaying the feedback status
const StatusIndicator = ({ content }: { content: string }) => {
  // Extract status indicator from content if present
  const statusMatch = content.match(/\[(CORRECT|INCORRECT|PARTIAL|MISCONCEPTION)\]/i);
  const status = statusMatch ? statusMatch[1].toUpperCase() : null;
  
  if (!status) return null;
  
  // Determine badge variant based on status
  let variant: "default" | "outline" | "secondary" | "destructive" = "outline";
  let icon = null;
  
  switch (status) {
    case 'CORRECT':
      variant = "outline";
      icon = <CheckCircle2 className="h-4 w-4 mr-1 text-green-600" />;
      break;
    case 'INCORRECT':
      variant = "outline";
      icon = <XCircle className="h-4 w-4 mr-1 text-red-600" />;
      break;
    case 'PARTIAL':
      variant = "outline";
      icon = <AlertTriangle className="h-4 w-4 mr-1 text-amber-600" />;
      break;
    case 'MISCONCEPTION':
      variant = "outline";
      icon = <HelpCircle className="h-4 w-4 mr-1 text-purple-600" />;
      break;
    default:
      break;
  }
  
  return (
    <Badge 
      variant={variant} 
      className="mb-2 px-3 py-1 text-sm flex items-center justify-center"
      style={{
        borderWidth: '1px',
        borderColor: status === 'CORRECT' ? 'rgb(22 163 74)' : 
                    status === 'INCORRECT' ? 'rgb(220 38 38)' : 
                    status === 'PARTIAL' ? 'rgb(217 119 6)' :
                    'rgb(147 51 234)'
      }}
    >
      {icon}
      {status}
    </Badge>
  );
}

interface FeedbackQuestionProps {
  block: FeedbackQuestionBlock;
  isStudentView: boolean;
  studentId?: string;
  isPaused?: boolean;
  onAnswerSubmit?: (blockId: string, answer: string | number | boolean) => void;
  isAnswered?: boolean;
  // New prop to determine whether to show all components or just a specific one
  displayMode?: 'all' | 'image' | 'question' | 'feedback';
  // New prop to indicate if this is part of a group
  isGrouped?: boolean;
  // Group ID for connected blocks
  groupId?: string;
  studentResponse?: string | boolean; // Add this prop to receive stored response
  sessionId?: string; // Add sessionId to props
  // Add new prop for reporting feedback status to parent component
  onFeedbackStatusChange?: (status: string | null) => void;
}

const FeedbackQuestion: React.FC<FeedbackQuestionProps> = ({
  block,
  isStudentView,
  studentId,
  isPaused = false,
  onAnswerSubmit,
  isAnswered = false,
  displayMode = 'all',
  isGrouped = false,
  groupId,
  studentResponse, // Add this prop
  sessionId, // Add sessionId to destructuring
  onFeedbackStatusChange // Add onFeedbackStatusChange to destructuring
}) => {
  const { user } = useAuth();
  const [teacherSettings, setTeacherSettings] = useState<{
    default_model?: string;
    openrouter_endpoint?: string;
  }>({});

  // Add TTS state
  const [ttsEnabled, setTTSEnabled] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Fetch teacher settings on mount
  useEffect(() => {
    const fetchTeacherSettings = async () => {
      if (!user?.id) return;
      const settings = await getUserSettings(user.id);
      if (settings) {
        setTeacherSettings({
          default_model: settings.default_model,
          openrouter_endpoint: settings.openrouter_endpoint
        });

        // If block doesn't have model settings, update it with defaults
        if (!block.modelName || !block.apiEndpoint) {
          onAnswerSubmit?.(block.id, {
            ...block,
            modelName: block.modelName || settings.default_model,
            apiEndpoint: block.apiEndpoint || settings.openrouter_endpoint
          });
        }
      }
    };

    fetchTeacherSettings();
  }, [user]);

  // Add this section at the start of the component to handle visual styles
  const getComponentStyle = () => {
    if (!isGrouped) return "";
    
    // Base style for grouped components
    let style = "border-2 relative ";
    
    // Different border colors based on display mode
    switch (displayMode) {
      case 'image':
        return style + "border-purple-200 bg-purple-50/30";
      case 'question':
        return style + "border-purple-300 bg-purple-50/40";
      case 'feedback':
        return style + "border-purple-400 bg-purple-50/50";
      default:
        return "";
    }
  };

  const renderGroupBadge = () => {
    if (!isGrouped || !groupId) return null;
    
    return (
      <div className="absolute -top-3 left-4 px-2 py-0.5 text-xs font-medium rounded-md bg-purple-100 text-purple-800">
        {displayMode ? `${displayMode} - Group ${groupId}` : `Group ${groupId}`}
      </div>
    );
  };

  // Question response state - initialize with studentResponse if provided
  const [response, setResponse] = useState<string | boolean | string[]>(
    studentResponse !== undefined ? studentResponse :
    block.questionType === 'multiple-choice' ? (block.allowMultipleAnswers ? [] : '') :
    block.questionType === 'true-false' ? false : ''
  );

  // Update response when studentResponse prop changes
  useEffect(() => {
    if (studentResponse !== undefined) {
      setResponse(studentResponse);
    }
  }, [studentResponse]);
  const [hasAnswered, setHasAnswered] = useState(isAnswered);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [conversationHistory, setConversationHistory] = useState<Message[]>([]);
  
  // AI chat state
  const [inputValue, setInputValue] = useState('');
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [feedbackStarted, setFeedbackStarted] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [showPracticeSimilar, setShowPracticeSimilar] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const studentCanRespond = isStudentView && studentId;
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages]);

  // Update response when answer changes externally
  useEffect(() => {
    if (isAnswered && !response) {
      // Handle different types of correct answers based on question type
      if (block.questionType === 'multiple-choice' || typeof block.correctAnswer === 'string') {
        setResponse(block.correctAnswer as string || '');
      } else if (block.questionType === 'true-false') {
        setResponse(!!block.correctAnswer);
      }
    }
  }, [isAnswered, block.correctAnswer, block.questionType]);

  // Maintain conversation history
  useEffect(() => {
    if (visibleMessages.length > 0) {
      setConversationHistory(visibleMessages);
    }
  }, [visibleMessages]);

  // Restore conversation history when component remounts
  useEffect(() => {
    if (conversationHistory.length > 0 && visibleMessages.length === 0) {
      setVisibleMessages(conversationHistory);
      setHasStarted(true);
    }
  }, []);

  // Add new state variables near the top of the component with other state declarations
  const [showCelebration, setShowCelebration] = useState(false);
  const [celebrationStyle, setCelebrationStyle] = useState<CelebrationSettings | null>(null);

  // Add effect to load celebration settings
  useEffect(() => {
    if (studentId) {
      getCelebrationSettings(studentId).then(settings => {
        if (settings) {
          setCelebrationStyle(settings);
        }
      });
    }
  }, [studentId]);

  // Add celebration config state at the top with other state declarations
  const [showCelebrationConfig, setShowCelebrationConfig] = useState(false);

  // Add useEffect to check for celebration settings and show config if needed
  useEffect(() => {
    if (studentId && !celebrationStyle && hasAnswered) {
      getCelebrationSettings(studentId).then(settings => {
        if (settings) {
          setCelebrationStyle(settings);
        } else {
          // If no settings exist, show config dialog
          setShowCelebrationConfig(true);
        }
      });
    }
  }, [studentId, celebrationStyle, hasAnswered]);

  // Add handler for saving celebration config
  const handleSaveCelebrationConfig = async (config: CelebrationSettings) => {
    if (!studentId) return;
    
    try {
      await updateCelebrationSettings(studentId, config);
      setCelebrationStyle(config);
      setShowCelebrationConfig(false);
      // Show celebration immediately after saving settings
      setShowCelebration(true);
    } catch (error) {
      console.error('Error saving celebration settings:', error);
    }
  };

  // Handle response change for the question part
  const handleResponseChange = (value: string | boolean | string[]) => {
    setResponse(value);
    // Convert array responses to a comma-separated string when submitting
    if (Array.isArray(value)) {
      onAnswerSubmit?.(block.id, value.join(', '));
    } else if (typeof value === 'boolean') {
      onAnswerSubmit?.(block.id, value);
    } else {
      onAnswerSubmit?.(block.id, value);
    }
  };
  
  // Submit question answer - fix response type handling
  const handleSubmitAnswer = () => {
    if (!onAnswerSubmit || !response) return;
    
    // Convert array responses to string before submitting
    const submittedResponse = Array.isArray(response) 
      ? response.join(', ') 
      : response;
    
    onAnswerSubmit(block.id, submittedResponse);
    setHasAnswered(true);
    
    // Check if the answer is correct
    let isResponseCorrect = false;
    
    if (Array.isArray(block.correctAnswer) && Array.isArray(response)) {
      // For multiple correct answers, check if all selected answers are correct
      // and if all correct answers have been selected
      const correctAnswerArray = block.correctAnswer as string[];
      const allSelectedAreCorrect = (response as string[]).every(r => correctAnswerArray.includes(r));
      const allCorrectAreSelected = correctAnswerArray.every(c => (response as string[]).includes(c));
      
      // For strict matching, both conditions must be true
      isResponseCorrect = allSelectedAreCorrect && allCorrectAreSelected;
    } else {
      // For single answer questions
      isResponseCorrect = response === block.correctAnswer;
    }
    
    setIsCorrect(isResponseCorrect);
    
    // Show celebration if answer is correct
    if (isResponseCorrect) {
      // First check if we have celebration settings
      if (!celebrationStyle) {
        // If no settings, show config dialog first
        setShowCelebrationConfig(true);
        // Once they save settings, the celebration will show automatically
      } else {
        setShowCelebration(true);
      }
    }
    
    setShowPracticeSimilar(true);
  };
  
  // Start the feedback chat with an initial AI message
  const startFeedbackChat = (initialMessage: string) => {
    setFeedbackStarted(true);
    setVisibleMessages([
      { 
        role: 'assistant', 
        content: initialMessage
      }
    ]);
    setHasStarted(true);
  };
  
  // Handle sending a chat message for feedback
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isPaused) return;
    
    const userMessage: Message = { role: 'user', content: inputValue };
    const updatedMessages = [...visibleMessages, userMessage];
    setVisibleMessages(updatedMessages);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Include current answer state in the context
      const questionInfo = `The student was asked: "${block.questionText}"`;
      const answerInfo = `Their current answer is: "${response}"`;
      const correctnessInfo = `This answer is ${isCorrect ? "correct" : "incorrect"}. The correct answer is: "${block.correctAnswer}".`;
      const studentExplanation = `The student explained their reasoning as follows: "${inputValue}"`;
      
      // Enhanced image context information
      const imageInfo = block.imageUrl ? 
        `This question includes a mathematical or visual problem shown in this image: ${block.imageUrl}` : '';

      // Create enhanced system prompt with strict instructions for extremely brief responses
      const enhancedSystemPrompt = `${block.feedbackSystemPrompt || ''}
Question Context:
${questionInfo}
${answerInfo}
${correctnessInfo}
${studentExplanation}
${imageInfo}

EXTREMELY IMPORTANT INSTRUCTIONS:
1. Provide ONLY 1-2 SHORT sentences. Your entire response must be under 40 words.
2. Start with one of these status indicators: [CORRECT], [INCORRECT], [PARTIAL], or [MISCONCEPTION]
3. Then provide your extremely brief assessment of their reasoning.
4. DO NOT provide additional explanations, tips, or follow-up questions.
5. DO NOT use bullet points or lists.
6. DO NOT repeat the question or the correct answer.
7. Focus ONLY on evaluating the quality of their explanation/reasoning.`;

      const repetitionPrevention = block.repetitionPrevention 
        ? `\n\n${block.repetitionPrevention}`
        : '';
        
      const systemPromptWithPrevention = enhancedSystemPrompt + repetitionPrevention;

      // Get user's default model
      const { data: { user } } = await supabase.auth.getUser();
      const defaultModel = user?.id ? await getDefaultModel(user.id) : await getDefaultModel();
      
      // Include full conversation history for context
      const apiMessages: Message[] = [
        { role: 'system', content: systemPromptWithPrevention },
        ...updatedMessages
      ];
      
      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || teacherSettings?.default_model || defaultModel,
        endpoint: block.apiEndpoint || teacherSettings?.openrouter_endpoint || 'https://openrouter.ai/api/v1/chat/completions',
        imageUrl: block.imageUrl
        // Removed the max_tokens parameter as it's not supported
      }, sessionId?.toString());

      if (aiResponse) {
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: aiResponse 
        };
        const newMessages = [...updatedMessages, assistantMessage];
        setVisibleMessages(newMessages);
        setConversationHistory(newMessages);

        // Play TTS for the AI response
        if (ttsEnabled) {
          await playTTS(aiResponse);
        }
      } else {
        setError('Failed to get a response from the AI.');
      }
    } catch (err) {
      console.error('Error in AI chat:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while communicating with the AI.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const checkAnswerCorrectness = () => {
    let isResponseCorrect = false;
    
    if (Array.isArray(block.correctAnswer) && Array.isArray(response)) {
      // For multiple correct answers, check if all selected answers are correct
      // and if all correct answers have been selected
      const correctAnswerArray = block.correctAnswer as string[];
      const allSelectedAreCorrect = (response as string[]).every(r => correctAnswerArray.includes(r));
      const allCorrectAreSelected = correctAnswerArray.every(c => (response as string[]).includes(c));
      
      // For strict matching, both conditions must be true
      isResponseCorrect = allSelectedAreCorrect && allCorrectAreSelected;
    } else {
      // For single answer questions
      isResponseCorrect = response === block.correctAnswer;
    }
    
    setIsCorrect(isResponseCorrect);
    return isResponseCorrect;
  };

  // Load TTS settings when component mounts
  useEffect(() => {
    const loadTTSSettings = async () => {
      if (user?.id) {
        const settings = await getTTSSettings(user.id);
        setTTSEnabled(settings.enabled);
      }
    };
    loadTTSSettings();
  }, [user?.id]);

  // Modified generateFeedback function to wait for student input instead of generating immediate feedback
  const generateFeedback = async () => {
    if (!response) {
      setError('Please provide an answer first.');
      return;
    }

    try {
      setIsLoading(true);
      setError(null);
      setHasAnswered(true);
      setFeedbackRequested(true);
      
      // Check answer correctness but don't show explicit feedback yet
      const isResponseCorrect = checkAnswerCorrectness();
      
      // Show celebration if answer is correct
      if (isResponseCorrect) {
        if (!celebrationStyle) {
          setShowCelebrationConfig(true);
        } else {
          setShowCelebration(true);
        }
      }

      // Instead of generating AI feedback, just show a prompt asking for student explanation
      setVisibleMessages([{ 
        role: 'assistant', 
        content: isResponseCorrect ? 
          "Your answer is correct. Please explain your reasoning in the box below." : 
          "Your answer is incorrect. Please explain what you think might be the mistake in your reasoning."
      }]);
      
      // Set states to indicate feedback has started
      setHasStarted(true);
      setFeedbackStarted(true);
    } catch (error) {
      console.error('Error processing answer:', error);
      setError(error instanceof Error ? error.message : 'Failed to process answer');
      setVisibleMessages([]); // Clear any partial messages on error
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleStarterClick = (starter: string) => {
    setInputValue(starter);
    // Focus the input after selecting a starter
    const inputElement = document.getElementById('feedback-chat-input');
    if (inputElement) {
      inputElement.focus();
    }
  };
  
  // Add new state to track if feedback has been requested
  const [feedbackRequested, setFeedbackRequested] = useState(false);

  // Add TTS functions next to other handlers
  const toggleTTS = async () => {
    if (user?.id) {
      const settings = await getTTSSettings(user.id);
      const newSettings = { ...settings, enabled: !ttsEnabled };
      await saveTTSSettings(user.id, newSettings);
      setTTSEnabled(!ttsEnabled);
    }
  };

  const playTTS = async (text: string) => {
    if (!ttsEnabled || !user?.id) return;
    
    try {
      setIsPlaying(true);
      const audioBuffer = await textToSpeech(text, user.id, sessionId);
      
      if (audioBuffer) {
        const blob = new Blob([audioBuffer], { type: 'audio/mpeg' });
        const url = URL.createObjectURL(blob);
        
        if (audioRef.current) {
          audioRef.current.src = url;
          await audioRef.current.play();
        }
      }
    } catch (error) {
      console.error('Error playing TTS:', error);
    } finally {
      setIsPlaying(false);
    }
  };

  // Add a function to extract status from a message and update parent component
  const extractAndUpdateStatus = useCallback((content: string) => {
    const statusMatch = content.match(/\[(CORRECT|INCORRECT|PARTIAL|MISCONCEPTION)\]/i);
    const status = statusMatch ? statusMatch[1].toUpperCase() : null;
    
    if (status && onFeedbackStatusChange) {
      onFeedbackStatusChange(status);
    }
  }, [onFeedbackStatusChange]);

  // Check all messages when visibleMessages changes
  useEffect(() => {
    if (visibleMessages.length > 0) {
      // Look for status indicators in the most recent message first
      for (let i = visibleMessages.length - 1; i >= 0; i--) {
        const message = visibleMessages[i];
        if (message.role === 'assistant') {
          extractAndUpdateStatus(message.content);
          break; // Only use the most recent assistant message
        }
      }
    }
  }, [visibleMessages, extractAndUpdateStatus]);

  // Render the question part of the block
  const renderQuestion = () => {
    // Function to get the option label based on option style
    const getOptionLabel = (index: number): string => {
      if (!block.optionStyle || block.optionStyle === 'text') {
        return '';
      }
      
      if (block.optionStyle === 'A-D') {
        return String.fromCharCode(65 + index); // A, B, C, D...
      } else if (block.optionStyle === 'F-J') {
        return String.fromCharCode(70 + index); // F, G, H, I, J...
      }
      
      return '';
    };
    
    return (
      <div className={cn(
        "p-4 bg-primary/5 rounded-md",
        isGrouped && "border-2 border-purple-200"
      )}>
        {isGrouped && groupId && (
          <div className="text-xs font-medium text-purple-600 mb-2 uppercase tracking-wide">
            Group: {groupId}
          </div>
        )}
        <div className="font-medium mb-3">
          <MarkdownWithMath content={preprocessContent(block.questionText)} />
        </div>
        
        {/* Multiple choice question */}
        {block.questionType === 'multiple-choice' && (
          <div className="space-y-2">
            <div className="space-y-2">
              {block.allowMultipleAnswers ? (
                // Multiple selection with checkboxes
                <div className="space-y-2">
                  {block.options?.map((option, index) => (
                    <div key={index} className="flex items-start space-x-2">
                      <div className="flex items-center gap-2">
                        <input 
                          type="checkbox" 
                          id={`${block.id}-option-${index}`}
                          checked={Array.isArray(response) ? response.includes(option) : response === option}
                          onChange={(e) => {
                            if (!block.allowAnswerChange && hasAnswered) return;
                            if (e.target.checked) {
                              const newResponse = Array.isArray(response) 
                                ? [...response, option] 
                                : [option];
                              handleResponseChange(newResponse as string[]);
                            } else {
                              const newResponse = Array.isArray(response) 
                                ? response.filter(item => item !== option) 
                                : [];
                              handleResponseChange(newResponse as string[]);
                            }
                          }}
                          disabled={isPaused || (!block.allowAnswerChange && hasAnswered)}
                          className="h-4 w-4 rounded border-gray-300 focus:ring-primary mt-1"
                        />
                        {getOptionLabel(index) && (
                          <span className="font-medium text-sm">{getOptionLabel(index)}.</span>
                        )}
                      </div>
                      <Label 
                        htmlFor={`${block.id}-option-${index}`}
                        className={cn(
                          "flex-1",
                          feedbackRequested && Array.isArray(block.correctAnswer) && block.correctAnswer.includes(option) && !isStudentView && "text-green-600 font-medium",
                          feedbackRequested && Array.isArray(response) && response.includes(option) && 
                          Array.isArray(block.correctAnswer) && !block.correctAnswer.includes(option) && "text-red-600"
                        )}
                      >
                        <MarkdownWithMath content={preprocessContent(option)} />
                        {feedbackRequested && !isStudentView && Array.isArray(block.correctAnswer) && block.correctAnswer.includes(option) && " (correct)"}
                      </Label>
                    </div>
                  ))}
                </div>
              ) : (
                // Single selection with radio buttons
                <RadioGroup 
                  value={Array.isArray(response) ? response[0] : response as string} 
                  onValueChange={(value) => {
                    if (!block.allowAnswerChange && hasAnswered) return;
                    handleResponseChange(value);
                  }}
                  disabled={isPaused || (!block.allowAnswerChange && hasAnswered)}
                >
                  {block.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <div className="flex items-center gap-2 min-w-[2rem]">
                        <RadioGroupItem 
                          value={option} 
                          id={`${block.id}-option-${index}`}
                          disabled={isPaused || (!block.allowAnswerChange && hasAnswered)}
                        />
                        {getOptionLabel(index) && (
                          <span className="font-medium text-sm">{getOptionLabel(index)}.</span>
                        )}
                      </div>
                      <Label 
                        htmlFor={`${block.id}-option-${index}`}
                        className={cn(
                          "pt-0.5", // Add slight padding to align with radio button
                          feedbackRequested && option === block.correctAnswer && !isStudentView && "text-green-600 font-medium",
                          feedbackRequested && option === response && option !== block.correctAnswer && "text-red-600"
                        )}
                      >
                        <MarkdownWithMath content={preprocessContent(option)} />
                        {feedbackRequested && !isStudentView && option === block.correctAnswer && " (correct)"}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              )}
              
              {studentCanRespond && (
                <Button
                  onClick={async () => {
                    setFeedbackRequested(true);
                    setHasAnswered(true);
                    await generateFeedback();
                  }}
                  disabled={isLoading || (Array.isArray(response) ? response.length === 0 : !response) || (!block.allowAnswerChange && hasAnswered)}
                  size="sm"
                  className="mt-4 w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {hasAnswered && !block.allowAnswerChange ? "Answer Submitted" : "Get Feedback"}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* True/false question */}
        {block.questionType === 'true-false' && (
          <div className="space-y-2">
            {studentCanRespond ? (
              <div className="space-y-2">
                <RadioGroup 
                  value={response === true ? "true" : response === false ? "false" : ""} 
                  onValueChange={(value) => {
                    if (!block.allowAnswerChange && hasAnswered) return;
                    handleResponseChange(value === "true");
                  }}
                  disabled={isPaused || (!block.allowAnswerChange && hasAnswered)}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="true" 
                      id={`${block.id}-true`}
                      disabled={isPaused || (!block.allowAnswerChange && hasAnswered)}
                    />
                    <Label htmlFor={`${block.id}-true`}>True</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="false" 
                      id={`${block.id}-false`}
                      disabled={isPaused || (!block.allowAnswerChange && hasAnswered)}
                    />
                    <Label htmlFor={`${block.id}-false`}>False</Label>
                  </div>
                </RadioGroup>
                
                <Button
                  onClick={async () => {
                    setFeedbackRequested(true);
                    setHasAnswered(true);
                    await generateFeedback();
                  }}
                  disabled={isLoading || response === '' || (!block.allowAnswerChange && hasAnswered)}
                  size="sm"
                  className="mt-4 w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {hasAnswered && !block.allowAnswerChange ? "Answer Submitted" : "Get Feedback"}
                </Button>
              </div>
            ) : (
              <div className="flex space-x-8">
                <div className={`flex items-center space-x-2 ${feedbackRequested && block.correctAnswer === true && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                  <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                    {feedbackRequested && block.correctAnswer === true && !isStudentView && (
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                    )}
                  </div>
                  <span>True</span>
                </div>
                <div className={`flex items-center space-x-2 ${feedbackRequested && block.correctAnswer === false && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                  <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                    {feedbackRequested && block.correctAnswer === false && !isStudentView && (
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                    )}
                  </div>
                  <span>False</span>
                </div>
              </div>
            )}
          </div>
        )}
        
        {/* Free response question */}
        {block.questionType === 'free-response' && (
          <div className="space-y-3">
            {studentCanRespond ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Enter your answer here..."
                  value={response as string || ''}
                  onChange={(e) => {
                    if (!block.allowAnswerChange && hasAnswered) return;
                    handleResponseChange(e.target.value);
                  }}
                  disabled={isPaused || (!block.allowAnswerChange && hasAnswered)}
                  className="min-h-[100px]"
                />
                <Button
                  onClick={async () => {
                    setFeedbackRequested(true);
                    setHasAnswered(true);
                    await generateFeedback();
                  }}
                  disabled={isLoading || !response || (response as string).trim() === '' || (!block.allowAnswerChange && hasAnswered)}
                  size="sm"
                  className="w-full flex items-center justify-center gap-2"
                >
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Sparkles className="h-4 w-4" />
                  )}
                  {hasAnswered && !block.allowAnswerChange ? "Answer Submitted" : "Get Feedback"}
                </Button>
              </div>
            ) : (
              <div>
                {feedbackRequested && block.correctAnswer && !isStudentView ? (
                  <div className="border border-dashed p-3 rounded-md">
                    <p className="text-sm font-medium">Sample answer:</p>
                    <MarkdownWithMath content={preprocessContent(block.correctAnswer as string)} />
                  </div>
                ) : (
                  <p className="text-muted-foreground">Free response question</p>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  // Render the feedback chat component
  const renderFeedback = () => {
    // Don't display the feedback component at all if no answer has been given
    // and we're not showing it to encourage answering
    if (!hasAnswered && !hasStarted && isStudentView) {
      return null;
    }
    
    if (!hasAnswered && isStudentView) {
      return (
        <div className={cn(
          "p-3 border rounded-md bg-muted/20 min-h-[100px]", // Reduced minimum height
          isGrouped && "border-2 border-purple-200"
        )}>
          {isGrouped && groupId && (
            <div className="text-xs font-medium text-purple-600 mb-2 uppercase tracking-wide">
              Group: {groupId}
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center">
            Select an answer and click "Get Feedback" to start a conversation
          </p>
        </div>
      );
    }

    return (
      <div className={cn(
        "flex flex-col rounded-md border shadow-sm h-auto max-h-[300px]", // Reduced height and made it more responsive
        isGrouped && "border-2 border-purple-200"
      )}>
        {isGrouped && groupId && (
          <div className="text-xs font-medium text-purple-600 p-2 border-b uppercase tracking-wide">
            Group: {groupId}
          </div>
        )}
        
        {/* Simplified compact feedback display */}
        <div className="flex-1 min-h-0"> 
          <ScrollArea className="h-full max-h-[220px]"> {/* Limited height */}
            <div className="p-3">
              {visibleMessages.length === 0 ? (
                <div className="flex items-center justify-center text-center p-2 text-muted-foreground">
                  <Sparkles className="h-4 w-4 mr-2 text-primary/50" />
                  <p className="text-sm">
                    {hasAnswered 
                      ? "Click \"Get Feedback\" to receive feedback" 
                      : "Answer the question to get feedback"}
                  </p>
                </div>
              ) : (
                <div className="text-sm">
                  {visibleMessages.map((message, index) => (
                    message.role === 'assistant' && (
                      <div key={index} className="markdown-content whitespace-pre-wrap">
                        <StatusIndicator content={message.content} />
                        <MarkdownWithMath content={preprocessContent(message.content)} />
                      </div>
                    )
                  ))}
                  {isLoading && (
                    <div className="flex items-center mt-2">
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      <span className="text-xs">Generating feedback...</span>
                    </div>
                  )}
                  {error && (
                    <div className="text-xs p-2 bg-destructive/10 text-destructive rounded">
                      {error}
                    </div>
                  )}
                </div>
              )}
            </div>
          </ScrollArea>
        </div>

        {/* Simplified input area */}
        <div className="p-2 border-t flex-shrink-0">
          {isPaused ? (
            <div className="bg-amber-50 text-amber-800 p-2 text-xs rounded-md">
              The teacher has paused interaction. Please wait...
            </div>
          ) : !hasAnswered ? (
            <div className="bg-amber-50 text-amber-800 p-1 text-xs rounded-md">
              Please answer the question first to get feedback.
            </div>
          ) : !feedbackRequested ? (
            <Button
              onClick={async () => {
                setFeedbackRequested(true);
                setHasAnswered(true);
                await generateFeedback();
              }}
              disabled={isLoading || !response}
              size="sm"
              className="w-full flex items-center justify-center gap-1"
            >
              {isLoading ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Sparkles className="h-3 w-3" />
              )}
              Get Feedback
            </Button>
          ) : (
            <div className="flex gap-1">
              <Input
                id="feedback-chat-input"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyPress}
                placeholder="Ask a follow-up question..."
                disabled={isLoading || isPaused}
                className="flex-grow text-xs h-7"
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputValue.trim() || isLoading || isPaused}
                size="sm"
                className="h-7 w-7 p-0"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <Send className="h-3 w-3" />
                )}
              </Button>
            </div>
          )}
        </div>
        <audio ref={audioRef} onEnded={() => setIsPlaying(false)} style={{ display: 'none' }} />
      </div>
    );
  };

  // Render the image section
  const renderImage = () => {
    if (block.imageUrl) {
      return (
        <div className={cn(
          "h-full flex flex-col justify-center bg-white rounded-md border shadow-sm",
          isGrouped && "border-2 border-purple-200"
        )}>
          {isGrouped && groupId && (
            <div className="text-xs font-medium text-purple-600 p-2 uppercase tracking-wide">
              Group: {groupId}
            </div>
          )}
          <div className="relative w-full h-full min-h-[300px] p-4">
            <ImageViewer 
              src={block.imageUrl} 
              alt={block.imageAlt || 'Question image'} 
              className="object-contain w-full h-full"
            />
          </div>
          {block.imageAlt && (
            <p className="text-sm text-center text-muted-foreground p-2 border-t">{block.imageAlt}</p>
          )}
        </div>
      );
    }
    return null;
  };
  
  // Decide what to render based on displayMode
  if (displayMode === 'image') {
    return block.imageUrl ? renderImage() : null;
  }
  
  if (displayMode === 'question') {
    return renderQuestion();
  }
  
  if (displayMode === 'feedback') {
    return renderFeedback();
  }
  
  // Default: render all components in two-column layout
  return (
    <div className={cn(
      isGrouped && getComponentStyle(),
      isGrouped && "p-4 rounded-lg"
    )}>
      {renderGroupBadge()}
      
      <div className="grid grid-cols-2 gap-6 h-full">
        {/* Column 1: Image */}
        <div className="h-full"> 
          {/* Image */}
          {block.imageUrl && (
            <div className="w-full bg-white rounded-md border shadow-sm h-full">
              <div className="relative w-full h-full">
                <ImageViewer 
                  src={block.imageUrl} 
                  alt={block.imageAlt || 'Question image'} 
                  className="object-contain w-full h-full"
                />
              </div>
              {block.imageAlt && (
                <p className="text-sm text-center text-muted-foreground p-2 border-t">{block.imageAlt}</p>
              )}
            </div>
          )}
        </div>
        
        {/* Column 2: Question and Chat feedback in vertical stack */}
        <div className="space-y-6 h-full">
          {/* Question */}
          {renderQuestion()}
          
          {/* AI Feedback chat */}
          <div className="h-full">
            {renderFeedback()}
          </div>
        </div>
      </div>
      <CelebrationOverlay
        show={showCelebration}
        onComplete={() => setShowCelebration(false)}
        style={celebrationStyle || undefined}
      />
      
      <CelebrationConfigDialog
        open={showCelebrationConfig}
        onOpenChange={setShowCelebrationConfig}
        onSave={handleSaveCelebrationConfig}
        initialConfig={celebrationStyle || undefined}
      />
    </div>
  );
};

export default FeedbackQuestion;
