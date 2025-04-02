import React, { useState, useRef, useEffect } from 'react';
import { AIChatBlock } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Loader2, Info, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchChatCompletion } from '@/services/aiService';
import ReactMarkdown from 'react-markdown';
import MathDisplay from './MathDisplay';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Helper function to preprocess content for proper LaTeX rendering
const preprocessContent = (content: string): string => {
  // Preserve currency symbols by escaping dollar signs intended as currency
  // This regex looks for dollar signs that appear to be used as currency
  return content
    // Handle currency notation: $X.XX (ensure it's not interpreted as LaTeX)
    .replace(/\$(\d+(\.\d+)?)/g, '\\$$1')
    // Convert standard LaTeX dollar delimiters to explicit \(...\) notation
    // This makes the delimiters more explicit and less prone to misinterpretation
    .replace(/\$\$(.*?)\$\$/g, '\\[$1\\]')
    .replace(/\$(.*?)\$/g, '\\($1\\)');
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
    <div className="space-y-2">
      {parts.map((part, index) => 
        part.isLatex ? (
          <MathDisplay key={index} latex={part.text} className="inline-block" />
        ) : (
          <ReactMarkdown key={index} components={{
            p: ({node, ...props}) => <p className="mb-2" {...props} />,
            h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-1" {...props} />,
            h4: ({node, ...props}) => <h4 className="text-sm font-bold mt-2 mb-1" {...props} />,
            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
            li: ({node, ...props}) => <li className="ml-2" {...props} />,
            a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-gray-300 pl-2 italic my-2" {...props} />,
            code: ({className, ...props}: any) => 
              className?.includes('inline') 
                ? <code className="bg-gray-100 rounded px-1 py-0.5" {...props} /> 
                : <pre className="bg-gray-100 p-2 rounded overflow-x-auto my-2"><code {...props} /></pre>
          }}>
            {part.text}
          </ReactMarkdown>
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
}

const AIChat: React.FC<AIChatProps> = ({
  block,
  isStudentView,
  studentId,
  isPaused = false,
  onAnswerSubmit,
  isAnswered = false,
  questionContext,
  isPreviewMode = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [showPracticeSimilar, setShowPracticeSimilar] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
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
        model: block.modelName || 'openai/gpt-4',  // Default to GPT-4 for better image understanding
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: block.apiKey,
        temperature: 0.7,
        maxTokens: block.maxTokens || 1000,
        imageUrl: questionContext.imageUrl  // Pass the image URL to the API
      });
      
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
        model: block.modelName || 'openai/gpt-4',
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: block.apiKey,
        temperature: 0.8, // Slightly higher temperature for creativity
        maxTokens: block.maxTokens || 1000,
        imageUrl: questionContext.imageUrl // Pass the image URL for context
      });
      
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
      // Create the system message with anti-repetition instructions if available
      const enhancedSystemPrompt = block.repetitionPrevention 
        ? `${systemPrompt}\n\n${block.repetitionPrevention}`
        : systemPrompt;
      
      // Create a clean conversation history for the API request
      // Start with the enhanced system prompt as a separate message
      const apiMessages: Message[] = [
        { role: 'system', content: enhancedSystemPrompt }
      ];
      
      // Add recent user and assistant messages for context
      // Limit to the last few messages to avoid context overload
      const recentHistory = visibleMessages.slice(-6);
      apiMessages.push(...recentHistory, userMessage);
      
      console.log('Sending messages to API:', JSON.stringify(apiMessages, null, 2));
      
      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || 'openai/gpt-3.5-turbo',
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: block.apiKey,
        temperature: 0.7,
        maxTokens: block.maxTokens || 1000
      });
      
      if (aiResponse) {
        console.log('Received AI response:', aiResponse);
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
    <div className="flex flex-col rounded-md border shadow-sm">
      {/* Instructions section */}
      <div className="p-3 border-b bg-muted/20">
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
      <ScrollArea className="h-[300px] p-4 flex-grow">
        {visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
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
            {showPracticeSimilar && (
              <div className="flex justify-center my-4">
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex items-center gap-1 text-xs"
                  onClick={handlePracticeSimilar}
                >
                  Practice a similar problem <ChevronRight className="h-3 w-3" />
                </Button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </ScrollArea>
      
      {/* Sentence starters */}
      {block.sentenceStarters && block.sentenceStarters.length > 0 && !isAnswered && (
        <div className="px-4 py-2 border-t flex flex-wrap gap-2">
          {block.sentenceStarters.map((starter, index) => (
            <Button
              key={index}
              variant="outline"
              size="sm"
              onClick={() => handleStarterClick(starter)}
              disabled={isLoading || isPaused}
              className="text-xs h-7"
            >
              {starter}
            </Button>
          ))}
        </div>
      )}
      
      {/* Input area */}
      <div className="p-3 border-t">
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
              className="flex-grow"
            />
            <Button
              onClick={handleSendMessage}
              disabled={!inputValue.trim() || isLoading || isPaused}
              size="icon"
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