import React, { useState, useRef, useEffect } from 'react';
import { AIChatBlock } from '@/types/lesson';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Send, Sparkles, Loader2, Info } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { fetchChatCompletion } from '@/services/aiService';
import ReactMarkdown from 'react-markdown';

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

interface AIChatProps {
  block: AIChatBlock;
  isStudentView: boolean;
  studentId?: string;
  isPaused?: boolean;
  onAnswerSubmit?: (blockId: string, answer: string | number | boolean) => void;
  isAnswered?: boolean;
}

const AIChat: React.FC<AIChatProps> = ({
  block,
  isStudentView,
  studentId,
  isPaused = false,
  onAnswerSubmit,
  isAnswered = false
}) => {
  const [inputValue, setInputValue] = useState('');
  const [visibleMessages, setVisibleMessages] = useState<Message[]>([]);
  const [systemPrompt, setSystemPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasStarted, setHasStarted] = useState(false);
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
            <p className="text-sm text-muted-foreground">{block.instructions}</p>
          </div>
        </div>
      </div>
      
      {/* Chat messages area */}
      <ScrollArea className="h-[300px] p-4 flex-grow">
        {visibleMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-4 text-muted-foreground">
            <Sparkles className="h-8 w-8 mb-2 text-primary/50" />
            <p className="text-sm mb-1">Start a conversation with the AI</p>
            <p className="text-xs">Use the sentence starters below or type your own message</p>
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
                        // Re-enable LaTeX-related plugins
                        remarkPlugins={[remarkMath]}
                        rehypePlugins={[
                          [
                            rehypeKatex, 
                            {
                              // KaTeX options for better compatibility with currency symbols
                              trust: true,
                              strict: false,
                              output: 'html',
                              throwOnError: false,
                              errorColor: '#cc0000',
                              delimiters: [
                                { left: '\\(', right: '\\)', display: false },
                                { left: '\\[', right: '\\]', display: true },
                                // Support for inline boxed answers
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
                          code: ({node, inline, ...props}) => 
                            inline ? <code className="bg-gray-100 rounded px-1 py-0.5" {...props} /> : <pre className="bg-gray-100 p-2 rounded overflow-x-auto my-2"><code {...props} /></pre>
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