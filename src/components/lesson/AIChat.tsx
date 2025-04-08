import React, { useState, useRef, useEffect } from 'react';
import { AIChatBlock } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Loader2, Info, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchChatCompletion } from '@/services/aiService';
import { getDefaultModel } from '@/services/userSettingsService';
import { supabase } from '@/integrations/supabase/client';
import ReactMarkdown from 'react-markdown';
import MathDisplay from './MathDisplay';
import { useAuth } from '@/context/AuthContext';
import { getUserSettings } from '@/services/userSettingsService';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Helper function to preprocess content for proper LaTeX rendering
const preprocessContent = (content: string): string => {
  // Remove any JSON blocks that might be in the content
  const jsonRegex = /\{(?:[^{}]|\{[^{}]*\})*\}/g;
  content = content.replace(jsonRegex, '');

  // Convert explicit \n to line breaks while preserving paragraph structure
  content = content
    .replace(/\\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n'); // Normalize multiple newlines to double newlines

  // Add line breaks for markdown formatting
  content = content
    .replace(/([^\n])(#{1,6}\s)/g, '$1\n\n$2')
    .replace(/([^\n])(Problem:|Steps:|Hint:|Steps to solve)/g, '$1\n\n$2')
    .replace(/(#{1,6}\s.*?)([^\n])/g, '$1\n$2')
    .replace(/([^\n])(\s*[-*+]\s)/g, '$1\n\n$2')
    .replace(/([^\n])(\s*\d+\.\s)/g, '$1\n\n$2');

  // Handle math expressions with proper spacing
  content = content
    // Handle display math with proper spacing
    .replace(/\$\$([^$]+?)\$\$/g, (_, math) => {
      const trimmedMath = math.trim();
      return '\n\n\\[' + trimmedMath + '\\]\n\n';
    })
    // Handle inline math while preserving spaces and text flow
    .replace(/\$([^\n$]+?)\$/g, (match, math) => {
      const trimmedMath = math.trim();
      const leadingSpace = math.startsWith(' ') ? ' ' : '';
      const trailingSpace = math.endsWith(' ') ? ' ' : '';
      return `${leadingSpace}\\(${trimmedMath}\\)${trailingSpace}`;
    });

  // Ensure consistent spacing around paragraphs
  content = content
    .replace(/([^\n])\n([^\n])/g, '$1\n\n$2')
    .trim();

  return content;
};

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

// Custom renderer for ReactMarkdown that uses MathDisplay for math content
const MarkdownWithMath = ({ content }: { content: string }) => {
  const parts = parseLatexExpressions(content);
  
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
              code: ({node, ...props}) => <code className="bg-muted rounded px-1" {...props} />
            }}>
              {part.text}
            </ReactMarkdown>
          </span>
        )
      )}
    </div>
  );
};

interface AIChatProps {
  block: AIChatBlock;
  isStudentView: boolean;
  studentId?: string;
  isPaused?: boolean;
  onAnswerSubmit?: (blockId: string, answer: string | number | boolean) => void;
  isAnswered?: boolean;
  // Add new props for enhanced feedback
  questionContext?: {
    imageUrl?: string;
    question?: string;
    studentAnswer?: string;
    correctAnswer?: string;
    questionType?: string;
  };
  isPreviewMode?: boolean;
  sessionId?: string; // Add sessionId prop
}

const AIChat: React.FC<AIChatProps> = ({
  block,
  isStudentView,
  studentId,
  isPaused = false,
  onAnswerSubmit,
  isAnswered = false,
  questionContext,
  isPreviewMode = false,
  sessionId // Add sessionId to destructuring
}) => {
  const { user } = useAuth();
  const [inputValue, setInputValue] = useState('');
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showPracticeSimilar, setShowPracticeSimilar] = useState(false);
  const [teacherSettings, setTeacherSettings] = useState<{
    default_model?: string;
    openrouter_endpoint?: string;
  }>({});
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Fetch teacher settings when component mounts
  useEffect(() => {
    const fetchTeacherSettings = async () => {
      if (sessionId) {
        try {
          const { data: sessionData } = await supabase
            .from('presentation_sessions')
            .select('user_id')
            .eq('id', sessionId)
            .single();

          if (sessionData?.user_id) {
            const { data: settings } = await supabase
              .from('user_settings')
              .select('default_model, openrouter_endpoint')
              .eq('user_id', sessionData.user_id)
              .single();

            if (settings) {
              setTeacherSettings(settings);
            }
          }
        } catch (error) {
          console.error('Error fetching teacher settings:', error);
        }
      }
    };

    fetchTeacherSettings();
  }, [sessionId]);

  // Initialize or update the system prompt when it changes
  useEffect(() => {
    if (block.systemPrompt !== systemPrompt) {
      setSystemPrompt(block.systemPrompt || '');
    }
  }, [block.systemPrompt]);
  
  // Scroll to bottom of chat when messages change
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [visibleMessages]);

  // Auto-trigger feedback in preview mode when context is available
  useEffect(() => {
    if (isPreviewMode && questionContext && isAnswered && !isLoading) {
      // Add delay to allow state updates to complete
      const timer = setTimeout(() => {
        generateAutomaticFeedback();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isPreviewMode, questionContext, isAnswered]);
  
  const generateAutomaticFeedback = async () => {
    if (!questionContext || isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get user's model settings
      const { data: { user } } = await supabase.auth.getUser();
      const defaultModel = user?.id ? await getDefaultModel(user.id) : await getDefaultModel();

      const feedbackPrompt = `You are a helpful mathematics tutor providing feedback on a student's answer.

Question Context:
- Question Type: ${questionContext.questionType}
- Question Asked: ${questionContext.question || "Unknown question"}
- Student's Answer: ${questionContext.studentAnswer || "No answer provided"}
- Correct Answer: ${questionContext.correctAnswer || "Unknown"}

Your Task:
1. First analyze if the answer is correct or incorrect
2. For problems with images:
   - Reference specific elements from the image when explaining
   - Help the student understand the underlying concepts using visual references
3. If correct:
   - Congratulate the student
   - Explain why their answer is correct using clear mathematical reasoning
   - Point out any good problem-solving strategies they used
4. If incorrect:
   - Be encouraging and supportive
   - Help them understand where they went wrong
   - Guide them through the correct solution step-by-step
   - Use clear mathematical notation (LaTeX) to explain concepts
5. Conclude by asking if they'd like a similar practice problem

Remember to use proper LaTeX notation for mathematical expressions (\\( inline \\) and \\[ display \\] mode).`;

      // Create the system message for the API request
      const apiMessages: Message[] = [
        { role: 'system', content: feedbackPrompt }
      ];
      
      console.log('Generating automatic feedback:', JSON.stringify(apiMessages, null, 2));
      
      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: defaultModel,
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        imageUrl: questionContext.imageUrl  // Pass the image URL to the API
      }, sessionId?.toString()); // Ensure sessionId is a string
      
      if (aiResponse) {
        console.log('Received AI feedback:', aiResponse);
        // Add the AI response to visible messages
        setVisibleMessages([
          { role: 'assistant', content: aiResponse }
        ]);
        setHasStarted(true);
        setShowPracticeSimilar(true);
      } else {
        setError('Failed to get feedback from the AI.');
      }
    } catch (err) {
      console.error('Error generating feedback:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating feedback.');
    } finally {
      setIsLoading(false);
    }
  };

  const handlePracticeSimilar = async () => {
    if (isLoading || !questionContext) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Get user's default model
      const { data: { user } } = await supabase.auth.getUser();
      const defaultModel = user?.id ? await getDefaultModel(user.id) : await getDefaultModel();

      const similarProblemPrompt = `
Create a new math practice problem similar to what the student just worked on.

Original Problem Context:
${questionContext.imageUrl 
  ? `- The original problem included a visual mathematical representation
- Create a similar problem that could also be represented visually
- Reference the visual elements from the original problem to create a similar one`
  : ""}
- Question Type: ${questionContext.questionType}
- Original Question: ${questionContext.question || "Unknown question"}
- Original Answer: ${questionContext.correctAnswer || "Unknown"}

Instructions:
1. Create a new problem of similar difficulty but with different numbers/variables
2. Format the problem clearly using LaTeX notation
3. Provide:
   - The problem statement
   - The correct answer
   - A step-by-step solution guide
4. Make sure the problem tests the same concept but is not identical
${questionContext.imageUrl 
  ? `5. Since the original problem was visual, describe:
   - How this new problem should be visually represented
   - What key visual elements should be included
   - How the visual representation helps understand the problem`
  : ""}

Use proper LaTeX notation: \\( inline \\) and \\[ display \\] mode for equations.`;

      const apiMessages: Message[] = [
        { role: 'system', content: similarProblemPrompt }
      ];
      
      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || defaultModel,
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        imageUrl: questionContext.imageUrl // Pass the image URL for context
      }, sessionId?.toString()); // Ensure sessionId is a string
      
      if (aiResponse) {
        // Add the AI response to visible messages
        setVisibleMessages(prev => [
          ...prev,
          { role: 'user', content: "Can I practice a similar problem?" },
          { role: 'assistant', content: aiResponse }
        ]);
        setShowPracticeSimilar(false);
      } else {
        setError('Failed to generate a similar problem.');
      }
    } catch (err) {
      console.error('Error generating similar problem:', err);
      setError(err instanceof Error ? err.message : 'An error occurred while generating a similar problem.');
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading || isPaused) return;
    
    const userMessage: Message = { role: 'user', content: inputValue };
    setVisibleMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    if (!hasStarted) {
      setHasStarted(true);
    }
    
    try {
      // Get user's model settings
      const { data: { user } } = await supabase.auth.getUser();
      const defaultModel = user?.id ? await getDefaultModel(user.id) : await getDefaultModel();
      
      const enhancedSystemPrompt = block.repetitionPrevention 
        ? `${systemPrompt}\n\n${block.repetitionPrevention}`
        : systemPrompt;
      
      const apiMessages: Message[] = [
        { role: 'system', content: enhancedSystemPrompt }
      ];
      
      const recentHistory = visibleMessages.slice(-6);
      apiMessages.push(...recentHistory, userMessage);

      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || teacherSettings.default_model || defaultModel,
        endpoint: block.apiEndpoint || teacherSettings.openrouter_endpoint || 'https://openrouter.ai/api/v1/chat/completions',
        temperature: 0.7
      }, sessionId?.toString());
      
      if (aiResponse) {
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: aiResponse 
        };
        setVisibleMessages(prev => [...prev, assistantMessage]);
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
  
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  const handleStarterClick = (starter: string) => {
    setInputValue(starter);
    // Focus the input after selecting a starter
    const inputElement = document.getElementById('chat-input');
    if (inputElement) {
      inputElement.focus();
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Instructions section */}
      <div className="p-3 border-b bg-muted/20 flex-shrink-0">
        <div className="flex items-start gap-2">
          <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
          <div>
            <h4 className="text-sm font-medium mb-1">Instructions</h4>
            <p className="text-sm text-muted-foreground">
              {questionContext && isAnswered 
                ? "Answer the question to get AI feedback" 
                : block.instructions}
            </p>
          </div>
        </div>
      </div>
      
      {/* Chat messages area */}
      <div className="flex-1 min-h-0"> {/* Add min-h-0 to enable proper flex behavior */}
        <ScrollArea className="h-full"> {/* Use h-full instead of absolute positioning */}
          <div className="p-4">
            {visibleMessages.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center p-4 text-muted-foreground min-h-[200px]">
                <Sparkles className="h-8 w-8 mb-2 text-primary/50" />
                {isPreviewMode && questionContext ? (
                  <>
                    <p className="text-sm mb-1">Submit your answer to get AI feedback</p>
                    <p className="text-xs">The AI will analyze your response and provide personalized help</p>
                  </>
                ) : (
                  <>
                    <p className="text-sm mb-1">Start a conversation with the AI</p>
                    <p className="text-xs">Use the sentence starters below or type your own message</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {visibleMessages.map((message, index) => (
                  <div
                    key={index}
                    className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[80%] rounded-lg p-3 ${
                        message.role === 'user'
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted'
                      }`}
                    >
                      {message.role === 'assistant' ? (
                        <div className="text-sm markdown-content">
                          <MarkdownWithMath content={message.content} />
                        </div>
                      ) : (
                        <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      )}
                    </div>
                  </div>
                ))}
                {isLoading && (
                  <div className="flex justify-start">
                    <div className="max-w-[80%] rounded-lg p-3 bg-muted">
                      <div className="flex items-center">
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        <span className="text-sm">Thinking...</span>
                      </div>
                    </div>
                  </div>
                )}
                {error && (
                  <div className="flex justify-center">
                    <div className="max-w-[80%] rounded-lg p-3 bg-destructive/10 text-destructive text-sm">
                      {error}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
      
      {/* Input area */}
      <div className="p-3 pt-2 border-t">
        {isPaused ? (
          <div className="bg-amber-50 text-amber-800 p-2 text-xs rounded-md">
            The teacher has paused interaction. Please wait...
          </div>
        ) : isAnswered && questionContext && isPreviewMode ? (
          <div className="bg-green-50 text-green-800 p-2 text-xs rounded-md flex justify-between items-center">
            <span>Your answer has been submitted</span>
            {visibleMessages.length === 0 && (
              <Button 
                size="sm" 
                onClick={generateAutomaticFeedback}
                disabled={isLoading}
                className="h-7 text-xs"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin mr-1" />
                ) : (
                  <Sparkles className="h-3 w-3 mr-1" />
                )}
                Get Feedback
              </Button>
            )}
          </div>
        ) : isAnswered ? (
          <div className="bg-green-50 text-green-800 p-2 text-xs rounded-md">
            You've completed this chat activity.
          </div>
        ) : (
          <div className="flex gap-2">
            <Input
              id="chat-input"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyPress}
              placeholder="Type your message..."
              disabled={isLoading || isPaused}
              className="flex-grow text-sm"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isPaused}
              size="icon"
              className="h-10"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </div>
      
      {/* Remove the specified sentence starters */}
      {block.sentenceStarters && block.sentenceStarters.length > 0 && !isAnswered && (
        <div className="px-3 py-1 border-t flex flex-wrap gap-1">
          {block.sentenceStarters
            .filter(starter => 
              !["Practice a similar problem", 
                "Can you explain why?",
                "I need help with...",
                "How did you get that?"].includes(starter))
            .map((starter, index) => (
              <Button
                key={index}
                variant="outline"
                size="sm"
                onClick={() => handleStarterClick(starter)}
                disabled={isLoading || isPaused}
                className="text-xs h-6 px-2"
              >
                {starter}
              </Button>
            ))}
        </div>
      )}

      {/* If the conversation has started, show a submit button for the teacher to mark it as done */}
      {hasStarted && isStudentView && !isAnswered && !isPaused && onAnswerSubmit && (
        <div className="p-3 pt-0">
          <Button
            onClick={() => onAnswerSubmit(block.id, true)}
            variant="outline"
            className="w-full text-xs h-8"
          >
            Mark as completed
          </Button>
        </div>
      )}
    </div>
  );
};

export default AIChat;
