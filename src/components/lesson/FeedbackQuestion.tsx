import React, { useState, useRef, useEffect } from 'react';
import { FeedbackQuestionBlock, QuestionBlock } from '@/types/lesson';
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

// Re-enable LaTeX-related imports
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import './katex-custom.css'; // Import our custom KaTeX styles

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

interface FeedbackQuestionProps {
  block: FeedbackQuestionBlock;
  isStudentView: boolean;
  studentId?: string;
  isPaused?: boolean;
  onAnswerSubmit?: (blockId: string, answer: string | number | boolean) => void;
  isAnswered?: boolean;
}

const FeedbackQuestion: React.FC<FeedbackQuestionProps> = ({
  block,
  isStudentView,
  studentId,
  isPaused = false,
  onAnswerSubmit,
  isAnswered = false
}) => {
  // Question response state
  const [response, setResponse] = useState<string | boolean>('');
  const [hasAnswered, setHasAnswered] = useState(isAnswered);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  
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
    
    // Generate automatic feedback after submission
    setTimeout(() => {
      generateAutomaticFeedback();
    }, 500);
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
    setVisibleMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);
    setError(null);
    
    try {
      // Create system prompt that includes information about the question and their answer
      const questionInfo = `The student was asked: "${block.questionText}"`;
      const answerInfo = `Their answer was: "${response}"`;
      const correctnessInfo = `This answer is ${isCorrect ? "correct" : "incorrect"}. The correct answer is: "${block.correctAnswer}".`;
      
      // Enhanced image context information
      const imageInfo = block.imageUrl ? 
        `This question includes a mathematical or visual problem shown in this image: ${block.imageUrl}
IMPORTANT INSTRUCTIONS FOR IMAGE:
- You MUST reference and analyze specific elements from the image when providing feedback
- When explaining concepts, refer to visual elements from the image to aid understanding
- If suggesting similar problems, ensure they match the visual style and complexity of the image
- Use clear mathematical notation (LaTeX) when discussing elements from the image
Image description: "${block.imageAlt || 'No description provided'}"` 
        : '';
      
      const enhancedSystemPrompt = `You are a helpful mathematics tutor providing feedback on a student's answer.

${questionInfo}
${answerInfo}
${correctnessInfo}
${imageInfo}

Your task:
1. First acknowledge whether the answer is correct or incorrect
2. For visual/mathematical problems:
   - Reference specific elements or details shown in the image
   - Use the image to explain why the answer is correct/incorrect
   - Help the student understand the underlying concepts using visual references
3. Use clear mathematical notation (LaTeX) to explain concepts
4. Be encouraging and supportive in your feedback
5. If the student needs help, guide them through the solution step-by-step

${block.feedbackSystemPrompt}`;
      
      const repetitionPrevention = block.repetitionPrevention 
        ? `\n\n${block.repetitionPrevention}`
        : '';
        
      const systemPromptWithPrevention = enhancedSystemPrompt + repetitionPrevention;
      
      // Create a clean conversation history for the API request
      // Start with the enhanced system prompt as a separate message
      const apiMessages: Message[] = [
        { role: 'system', content: systemPromptWithPrevention }
      ];
      
      // Add recent user and assistant messages for context
      // Limit to the last few messages to avoid context overload
      const recentHistory = visibleMessages.slice(-6);
      apiMessages.push(...recentHistory, userMessage);
      
      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || 'openai/gpt-4',  // Default to GPT-4 for better image understanding
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: block.apiKey,
        temperature: 0.7,
        maxTokens: block.maxTokens || 1000
      });
      
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
  
  const generateAutomaticFeedback = async () => {
    if (!block || isLoading) return;
    
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
   - Use clear mathematical notation (LaTeX) to explain concepts
5. Format your initial response as a JSON object with these fields:
   - image_content: description of what you see in the image (the math problem)
   - question: the question that was asked
   - student_answer: what the student answered
   - correct_answer: the correct answer
   - explanation: detailed explanation of how to solve it
   - is_correct: boolean indicating if student was correct
6. After the JSON, provide helpful feedback to the student
7. Conclude by asking if they'd like a similar practice problem

Remember to use proper LaTeX notation for mathematical expressions (\\( inline \\) and \\[ display \\] mode).`;

      // Create the system message for the API request
      const apiMessages: Message[] = [
        { role: 'system', content: feedbackPrompt }
      ];

      // Add a user message to provide context
      apiMessages.push({
        role: 'user',
        content: `I've answered the question "${block.questionText}" with "${response}". Please analyze my answer and provide feedback.`
      });

      const aiResponse = await fetchChatCompletion({
        messages: apiMessages,
        model: block.modelName || 'openai/gpt-4o-mini',  // Use GPT-4o-mini for better image understanding
        endpoint: block.apiEndpoint || 'https://openrouter.ai/api/v1/chat/completions',
        apiKey: block.apiKey,
        temperature: 0.7,
        maxTokens: block.maxTokens || 1000,
        imageUrl: block.imageUrl  // Pass the image URL to include the actual image
      });
      
      if (aiResponse) {
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
      <div className="p-4 bg-primary/5 rounded-md">
        <p className="font-medium mb-3">{block.questionText}</p>
        
        {/* Multiple choice question */}
        {block.questionType === 'multiple-choice' && (
          <div className="space-y-2">
            {studentCanRespond && !hasAnswered ? (
              <div className="space-y-2">
                <RadioGroup 
                  value={response as string} 
                  onValueChange={(value) => handleResponseChange(value)}
                  disabled={isPaused || hasAnswered}
                >
                  {block.options?.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem 
                        value={option} 
                        id={`${block.id}-option-${index}`}
                        disabled={isPaused || hasAnswered}
                      />
                      <Label 
                        htmlFor={`${block.id}-option-${index}`}
                      >
                        {getOptionLabel(index) && (
                          <span className="font-medium mr-1">{getOptionLabel(index)}.</span>
                        )}
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
                
                <Button 
                  className="mt-3" 
                  size="sm" 
                  onClick={handleSubmitAnswer}
                  disabled={!response || isPaused || hasAnswered}
                >
                  {hasAnswered ? "Submitted" : "Submit"}
                </Button>
              </div>
            ) : (
              <ul className="space-y-1 list-disc list-inside">
                {block.options?.map((option, index) => (
                  <li 
                    key={index}
                    className={option === block.correctAnswer ? "text-green-600 font-medium" : ""}
                  >
                    {getOptionLabel(index) && (
                      <span className="font-medium mr-1">{getOptionLabel(index)}.</span>
                    )}
                    {option}
                    {option === block.correctAnswer && !isStudentView && " (correct)"}
                  </li>
                ))}
              </ul>
            )}
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
        <div className="p-3 border rounded-md bg-muted/20">
          <p className="text-sm text-muted-foreground text-center">
            Answer the question to get AI feedback
          </p>
        </div>
      );
    }
    
    return (
      <div className="flex flex-col rounded-md border shadow-sm">
        {/* Instructions section */}
        <div className="p-3 border-b bg-muted/20">
          <div className="flex items-start gap-2">
            <Info className="h-5 w-5 text-muted-foreground mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium mb-1">Feedback</h4>
              <p className="text-sm text-muted-foreground">{block.feedbackInstructions}</p>
            </div>
          </div>
        </div>
        
        {/* Chat messages area */}
        <ScrollArea className="h-[250px] p-4 flex-grow">
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
                        <ReactMarkdown
                          remarkPlugins={[remarkMath]}
                          rehypePlugins={[
                            [
                              rehypeKatex, 
                              {
                                trust: true,
                                strict: false,
                                output: 'html',
                                throwOnError: false,
                                errorColor: '#cc0000',
                                delimiters: [
                                  { left: '\\(', right: '\\)', display: false },
                                  { left: '\\[', right: '\\]', display: true },
                                  { left: '\\boxed{', right: '}', display: false }
                                ]
                              }
                            ]
                          ]}
                          components={{
                            p: ({node, ...props}) => <p className="mb-2" {...props} />,
                            h3: ({node, ...props}) => <h3 className="text-base font-bold mt-3 mb-1" {...props} />,
                            h4: ({node, ...props}) => <h4 className="text-sm font-bold mt-2 mb-1" {...props} />,
                            ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                            ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                            li: ({node, ...props}) => <li className="ml-2" {...props} />,
                            a: ({node, ...props}) => <a className="text-blue-600 hover:underline" {...props} />,
                            blockquote: ({node, ...props}) => <blockquote className="border-l-2 border-gray-300 pl-2 italic my-2" {...props} />,
                            code: ({node, className, ...props}: any) => 
                              className?.includes('inline') 
                                ? <code className="bg-gray-100 rounded px-1 py-0.5" {...props} /> 
                                : <pre className="bg-gray-100 p-2 rounded overflow-x-auto my-2"><code {...props} /></pre>
                          }}
                        >
                          {/* Preprocess content for proper LaTeX rendering */}
                          {preprocessContent(message.content)}
                        </ReactMarkdown>
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
        <div className="mb-4 p-4 bg-white rounded-md border shadow-sm">
          <ImageViewer 
            src={block.imageUrl} 
            alt={block.imageAlt || 'Question image'} 
          />
          {block.imageAlt && (
            <p className="text-sm text-center text-muted-foreground mt-2">{block.imageAlt}</p>
          )}
        </div>
      );
    }
    return null;
  };
  
  return (
    <div className="space-y-4">
      {/* All three components together in a vertical layout */}
      {/* 1. Image (if present) */}
      {renderImage()}
      
      {/* 2. Question */}
      {renderQuestion()}
      
      {/* 3. AI Feedback chat */}
      {renderFeedback()}
    </div>
  );
};

export default FeedbackQuestion;
