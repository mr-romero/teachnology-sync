import React, { useState, useRef, useEffect } from 'react';
import { FeedbackQuestionBlock } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Send, Sparkles, Loader2, Info, ChevronRight } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchChatCompletion } from '@/services/aiService';
import ReactMarkdown from 'react-markdown';
import ImageViewer from './ImageViewer';
import AIChat from './AIChat';  // Add AIChat import
import { cn } from '@/lib/utils';
import MathDisplay from './MathDisplay';

interface Message {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

// Helper function to preprocess content for proper LaTeX rendering
const preprocessContent = (content: string): string => {
  // Remove JSON blocks from the content
  const jsonRegex = /\{(?:[^{}]|\{[^{}]*\})*\}/g;
  content = content.replace(jsonRegex, '');

  // Ensure proper escaping for MathQuill rendering
  content = content.replace(/\\text\{(.*?)\}/g, '\\mathrm{$1}');

  // Preserve currency symbols by escaping dollar signs intended as currency
  return content
    // Handle currency notation: $X.XX (ensure it's not interpreted as LaTeX)
    .replace(/\$(\d+(\.\d+)?)/g, '\\\$$1')
    // Convert standard LaTeX dollar delimiters to explicit \(...\) notation
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
  studentResponse // Add this prop
}) => {
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
  const [response, setResponse] = useState<string | boolean>(
    studentResponse !== undefined ? studentResponse :
    block.questionType === 'multiple-choice' ? '' :
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

  // Handle response change for the question part
  const handleResponseChange = (value: string | boolean) => {
    setResponse(value);
  };
  
  // Submit question answer
  const handleSubmitAnswer = () => {
    if (!onAnswerSubmit || !response) return;
    
    onAnswerSubmit(block.id, response);
    setHasAnswered(true);
    
    // Check if the answer is correct
    const isResponseCorrect = response === block.correctAnswer;
    setIsCorrect(isResponseCorrect);
    
    // Don't auto-generate feedback immediately to allow state updates to complete
    // and give a better UX by showing the submit confirmation first
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
      
      // Enhanced image context information
      const imageInfo = block.imageUrl ? 
        `This question includes a mathematical or visual problem shown in this image: ${block.imageUrl}` : '';

      // Create enhanced system prompt with context
      const enhancedSystemPrompt = `${block.feedbackSystemPrompt || ''}
Question Context:
${questionInfo}
${answerInfo}
${correctnessInfo}
${imageInfo}`;

      const repetitionPrevention = block.repetitionPrevention 
        ? `\n\n${block.repetitionPrevention}`
        : '';
        
      const systemPromptWithPrevention = enhancedSystemPrompt + repetitionPrevention;
      
      // Include full conversation history for context
      const apiMessages: Message[] = [
        { role: 'system', content: systemPromptWithPrevention },
        ...updatedMessages
      ];
      
      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || 'openai/gpt-4',
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        maxTokens: block.maxTokens || 1000,
        imageUrl: block.imageUrl
      });
      
      if (aiResponse) {
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: aiResponse 
        };
        const newMessages = [...updatedMessages, assistantMessage];
        setVisibleMessages(newMessages);
        setConversationHistory(newMessages);
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
  
  const generateFeedback = async () => {
    if (isLoading) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Create a system prompt that includes structured output instructions
      const feedbackPrompt = `You are a helpful mathematics tutor providing feedback on a student's answer.

Question Context:
- Question Type: ${block.questionType}
- Question Asked: "${block.questionText || "Unknown question"}"
- Student's Answer: "${response || "No answer provided"}"
- Correct Answer: "${block.correctAnswer || "Unknown"}"

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
   - Use clear mathematical notation (LaTeX) to explain concepts`;

      // Add repetition prevention if available
      const systemPromptWithPrevention = block.repetitionPrevention 
        ? `${feedbackPrompt}\n\n${block.repetitionPrevention}`
        : feedbackPrompt;

      // Set up messages for the API request
      const apiMessages: Message[] = [
        { role: 'system', content: systemPromptWithPrevention },
        { role: 'user', content: `I've answered the question "${block.questionText}" with "${response}". Please analyze my answer and provide feedback.` }
      ];

      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || 'openai/gpt-4',
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        maxTokens: block.maxTokens || 1000,
        imageUrl: block.imageUrl
      });
      
      if (aiResponse) {
        const assistantMessage: Message = { 
          role: 'assistant', 
          content: aiResponse 
        };
        setVisibleMessages([assistantMessage]);
        setHasStarted(true);
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
        <p className="font-medium mb-3">{block.questionText}</p>
        
        {/* Multiple choice question */}
        {block.questionType === 'multiple-choice' && (
          <div className="space-y-2">
            <div className="space-y-2">
              <RadioGroup 
                value={response as string} 
                onValueChange={(value) => handleResponseChange(value)}
                disabled={isPaused || (hasAnswered && !block.allowAnswerChange)}
              >
                {block.options?.map((option, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value={option} 
                      id={`${block.id}-option-${index}`}
                      disabled={isPaused || (hasAnswered && !block.allowAnswerChange)}
                    />
                    <Label 
                      htmlFor={`${block.id}-option-${index}`}
                      className={cn(
                        option === block.correctAnswer && !isStudentView && "text-green-600 font-medium",
                        hasAnswered && option === response && option !== block.correctAnswer && "text-red-600"
                      )}
                    >
                      {getOptionLabel(index) && (
                        <span className="font-medium mr-1">{getOptionLabel(index)}.</span>
                      )}
                      {option}
                      {!isStudentView && option === block.correctAnswer && " (correct)"}
                    </Label>
                  </div>
                ))}
              </RadioGroup>
              
              {studentCanRespond && (
                <Button 
                  className="mt-3" 
                  size="sm" 
                  onClick={handleSubmitAnswer}
                  disabled={!response || isPaused || (!block.allowAnswerChange && hasAnswered)}
                >
                  {hasAnswered ? (block.allowAnswerChange ? "Change Answer" : "Submitted") : "Submit"}
                </Button>
              )}
            </div>
          </div>
        )}
        
        {/* True/false question */}
        {block.questionType === 'true-false' && (
          <div className="space-y-2">
            {studentCanRespond && !hasAnswered ? (
              <div className="space-y-2">
                <RadioGroup 
                  value={response === true ? "true" : response === false ? "false" : ""} 
                  onValueChange={(value) => handleResponseChange(value === "true")}
                  disabled={isPaused || hasAnswered}
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="true" 
                      id={`${block.id}-true`}
                      disabled={isPaused || hasAnswered}
                    />
                    <Label 
                      htmlFor={`${block.id}-true`}
                    >
                      True
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem 
                      value="false" 
                      id={`${block.id}-false`}
                      disabled={isPaused || hasAnswered}
                    />
                    <Label 
                      htmlFor={`${block.id}-false`}
                    >
                      False
                    </Label>
                  </div>
                </RadioGroup>
                
                <Button 
                  className="mt-3" 
                  size="sm" 
                  onClick={handleSubmitAnswer}
                  disabled={response === '' || isPaused || hasAnswered}
                >
                  {hasAnswered ? "Submitted" : "Submit"}
                </Button>
              </div>
            ) : (
              <div className="flex space-x-8">
                <div className={`flex items-center space-x-2 ${block.correctAnswer === true && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                  <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                    {block.correctAnswer === true && !isStudentView && (
                      <div className="h-2 w-2 rounded-full bg-green-600" />
                    )}
                  </div>
                  <span>True</span>
                </div>
                <div className={`flex items-center space-x-2 ${block.correctAnswer === false && !isStudentView ? "text-green-600 font-medium" : ""}`}>
                  <div className="h-4 w-4 rounded-full border-2 flex items-center justify-center">
                    {block.correctAnswer === false && !isStudentView && (
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
            {studentCanRespond && !hasAnswered ? (
              <div className="space-y-3">
                <Textarea
                  placeholder="Enter your answer here..."
                  value={response as string || ''}
                  onChange={(e) => handleResponseChange(e.target.value)}
                  disabled={isPaused || hasAnswered}
                  className="min-h-[100px]"
                />
                <Button 
                  size="sm" 
                  onClick={handleSubmitAnswer}
                  disabled={!response || (response as string).trim() === '' || isPaused || hasAnswered}
                >
                  {hasAnswered ? "Submitted" : "Submit"}
                </Button>
              </div>
            ) : (
              <div>
                {block.correctAnswer && !isStudentView ? (
                  <div className="border border-dashed p-3 rounded-md">
                    <p className="text-sm font-medium">Sample answer:</p>
                    <p>{block.correctAnswer as string}</p>
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
  
  // Render the AI chat feedback part
  const renderFeedback = () => {
    if (!hasAnswered && isStudentView) {
      return (
        <div className={cn(
          "p-3 border rounded-md bg-muted/20",
          isGrouped && "border-2 border-purple-200"
        )}>
          {isGrouped && groupId && (
            <div className="text-xs font-medium text-purple-600 mb-2 uppercase tracking-wide">
              Group: {groupId}
            </div>
          )}
          <p className="text-sm text-muted-foreground text-center">
            Answer the question to get AI feedback
          </p>
        </div>
      );
    }
    
    return (
      <div className={cn(
        "flex flex-col rounded-md border shadow-sm",
        isGrouped && "border-2 border-purple-200"
      )}>
        {isGrouped && groupId && (
          <div className="text-xs font-medium text-purple-600 p-2 border-b uppercase tracking-wide">
            Group: {groupId}
          </div>
        )}
        {/* Instructions section */}
        <div className="p-3 border-b bg-muted/20">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium mb-1">Feedback</h4>
              <p className="text-xs text-muted-foreground">Ask for help if you need additional explanation.</p>
            </div>
          </div>
        </div>
        
        {/* Chat messages area */}
        <ScrollArea className="h-[200px] p-4 flex-grow bg-white">
          {visibleMessages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
              <Sparkles className="h-8 w-8 mb-2 text-primary/50" />
              <p className="text-sm mb-1">Answer the question to get feedback</p>
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
                        <MarkdownWithMath content={preprocessContent(message.content)} />
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
              {showPracticeSimilar && hasAnswered && (
                <div className="flex justify-center my-4">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    className="flex items-center gap-1 text-xs"
                    onClick={() => {
                      setShowPracticeSimilar(false);
                      setInputValue("Can I practice a similar problem?");
                      setTimeout(() => handleSendMessage(), 100);
                    }}
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
        {block.feedbackSentenceStarters && block.feedbackSentenceStarters.length > 0 && hasAnswered && (
          <div className="px-4 py-2 border-t flex flex-wrap gap-2">
            {block.feedbackSentenceStarters.map((starter, index) => (
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
          ) : !hasAnswered ? (
            <div className="bg-amber-50 text-amber-800 p-2 text-xs rounded-md">
              Please answer the question first to get feedback.
            </div>
          ) : (
            <div className="flex gap-2">
              <Input
                id="feedback-chat-input"
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
      
      <div className="grid grid-cols-2 gap-6">
        {/* Column 1: Image */}
        <div className="h-full">
          {block.imageUrl && renderImage()}
        </div>
        
        {/* Column 2: Question and Feedback */}
        <div className="space-y-6">
          {/* Question */}
          {renderQuestion()}
          
          {/* Show Get Feedback button after submitting */}
          {hasAnswered && !visibleMessages.length && (
            <div className="flex justify-center py-2">
              <Button
                onClick={generateFeedback}
                disabled={isLoading}
                size="sm"
                className="flex items-center gap-2"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Sparkles className="h-4 w-4" />
                )}
                Get Feedback
              </Button>
            </div>
          )}
          
          {/* AI Feedback chat */}
          {renderFeedback()}
        </div>
      </div>
    </div>
  );
};

export default FeedbackQuestion;
