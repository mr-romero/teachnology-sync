import { supabase } from "@/integrations/supabase/client";
import { getImageAsBase64 } from "./imageService";
import { getOpenRouterApiKey } from './userSettingsService';

/**
 * Interface for OpenRouter.ai request parameters
 */
interface OpenRouterRequestParams {
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * Interface for a general LLM API request
 */
interface LLMRequestParams {
  endpoint: string;
  apiKey: string;
  model: string;
  messages: {
    role: 'system' | 'user' | 'assistant';
    content: string;
  }[];
  max_tokens?: number;
  temperature?: number;
}

/**
 * Send a request to an LLM endpoint (OpenRouter.ai by default)
 * @param params API request parameters
 * @returns LLM response text or error
 */
export const sendLLMRequest = async (
  params: LLMRequestParams
): Promise<{ text: string } | { error: string }> => {
  try {
    const { endpoint, apiKey, model, messages, max_tokens = 1024, temperature = 0.7 } = params;
    
    const headers: HeadersInit = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${apiKey}`
    };
    
    // For OpenRouter, add HTTP_REFERER header
    if (endpoint.includes('openrouter.ai')) {
      headers["HTTP-Referer"] = window.location.origin;
    }
    
    const response = await fetch(endpoint, {
      method: "POST",
      headers,
      body: JSON.stringify({
        model,
        messages,
        max_tokens,
        temperature
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("LLM API error:", errorData);
      return { error: errorData.error?.message || "Failed to get response from AI model" };
    }

    const data = await response.json();
    let content: string | null = null;
    
    // Handle different response formats
    if (endpoint.includes('openrouter.ai')) {
      // Add more robust error handling and logging
      if (!data.choices || !Array.isArray(data.choices) || data.choices.length === 0) {
        console.error('Invalid response format from OpenRouter:', data);
        throw new Error('Invalid response format: missing choices array');
      }
      
      const choice = data.choices[0];
      if (!choice || !choice.message) {
        console.error('Invalid choice format:', choice);
        throw new Error('Invalid choice format: missing message');
      }
      
      // Handle both string and array content formats
      if (Array.isArray(choice.message.content)) {
        // If content is an array, find text content
        const textContent = choice.message.content.find(item => 
          item.type === 'text' && item.text
        );
        content = textContent?.text || null;
      } else {
        // If content is a string, use it directly
        content = choice.message.content;
      }
      
      if (content === null || content === undefined) {
        console.error('No valid content found in message:', choice.message);
        throw new Error('No valid content found in OpenRouter response');
      }
      
      console.log('Extracted content from OpenRouter format:', content);
    } else if (endpoint.includes('openai.com')) {
      if (!data.choices?.[0]?.message?.content) {
        console.error('Invalid OpenAI response format:', data);
        throw new Error('Invalid OpenAI response format');
      }
      content = data.choices[0].message.content;
      console.log('Extracted content from OpenAI format:', content);
    } else {
      // Generic fallback for other APIs
      content = data.choices?.[0]?.message?.content || 
                data.choices?.[0]?.text || 
                data.response || 
                data.output;
      
      if (!content) {
        console.error('No valid content found in response:', data);
        throw new Error('No valid content found in API response');
      }
      
      console.log('Extracted content from generic format:', content);
    }
    
    return { text: content };
  } catch (error) {
    console.error("Exception in sendLLMRequest:", error);
    return { error: error instanceof Error ? error.message : "Failed to communicate with AI model" };
  }
};

/**
 * Get stored API keys from user metadata
 * @param userId The user ID to get API keys for
 * @returns Object containing API keys or null if not found
 */
export const getAPIKeys = async (userId: string): Promise<Record<string, string> | null> => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('api_keys')
      .eq('id', userId)
      .single();
    
    if (error || !data?.api_keys) {
      console.error('Error getting API keys:', error);
      return null;
    }
    
    return data.api_keys as Record<string, string>;
  } catch (error) {
    console.error('Exception in getAPIKeys:', error);
    return null;
  }
};

/**
 * Save API key to user metadata
 * @param userId The user ID to save the API key for
 * @param service The service name (e.g., 'openrouter', 'openai')
 * @param apiKey The API key to save
 * @returns Success status
 */
export const saveAPIKey = async (
  userId: string,
  service: string,
  apiKey: string
): Promise<boolean> => {
  try {
    // Get existing API keys
    const existingKeys = await getAPIKeys(userId) || {};
    
    // Update with new key
    const updatedKeys = {
      ...existingKeys,
      [service]: apiKey
    };
    
    // Save back to database
    const { error } = await supabase
      .from('users')
      .update({ api_keys: updatedKeys })
      .eq('id', userId);
    
    if (error) {
      console.error('Error saving API key:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Exception in saveAPIKey:', error);
    return false;
  }
};

// Define types for content items in messages
type ContentItem = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// Define message types that can have either string or array content
type Message = {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentItem[];
};

interface FetchChatCompletionParams {
  messages: Message[];
  model?: string;
  temperature?: number;
  endpoint?: string;
  imageUrl?: string;
}

/**
 * Fetches a chat completion from the specified AI model provider
 */
export async function fetchChatCompletion({
  messages,
  model = 'openai/gpt-4',
  temperature = 0.7,
  endpoint = 'https://openrouter.ai/api/v1/chat/completions',
  imageUrl
}: FetchChatCompletionParams, sessionId?: string): Promise<string | null> {
  try {
    // Get the API key from user settings
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting current user:', userError);
      throw new Error('Failed to get current user');
    }
    
    if (!user?.id) {
      console.error('No user ID found');
      throw new Error('No user found');
    }

    // First try to get API key from user settings
    let apiKey = await getOpenRouterApiKey(user.id);
    
    // If no API key found, try to get teacher's API key from the presentation settings
    if (!apiKey) {
      // Get session ID from URL, handling both full URLs and path segments
      const pathSegments = window.location.pathname.split('/');
      const sessionId = pathSegments[pathSegments.length - 1];
      
      console.log('Extracted session ID from URL:', sessionId);

      if (sessionId && sessionId.length > 0) {
        console.log('Looking up presentation settings for session:', sessionId);
        try {
          // Query the presentation_settings table directly using session_id
          const { data: settings, error: settingsError } = await supabase
            .from('presentation_settings')
            .select('openrouter_api_key')
            .eq('session_id', sessionId)
            .single();

          if (settingsError) {
            console.error('Error getting presentation settings:', settingsError);
            throw new Error('Could not retrieve presentation settings');
          }

          console.log('Retrieved presentation settings:', settings);

          if (settings?.openrouter_api_key) {
            apiKey = settings.openrouter_api_key;
            console.log('Successfully retrieved API key from presentation settings');
          } else {
            console.log('No API key found in presentation settings');
          }
        } catch (err) {
          console.error('Error in presentation settings lookup:', err);
        }
      } else {
        console.log('No session ID found in URL:', window.location.pathname);
      }
    }
    
    if (!apiKey) {
      throw new Error('No API key found. Please add your OpenRouter API key in Settings.');
    }

    console.log(`Making request to ${endpoint} with model ${model}`);
    
    // Process messages to include image if provided
    let processedMessages = [...messages];
    let base64Image: string | null = null;
    
    if (imageUrl) {
      console.log('Processing image for LLM:', imageUrl);
      
      // Convert image to base64
      base64Image = await getImageAsBase64(imageUrl);
      
      if (!base64Image) {
        console.error('Failed to convert image to base64');
      } else {
        console.log('Successfully converted image to base64');
        
        // Create a structured message with the image
        // Format depends on the model and endpoint
        if (endpoint.includes('openrouter.ai')) {
          // For OpenRouter with GPT-4o-mini
          // Find the first user message to add the image to
          const userMessageIndex = processedMessages.findIndex(msg => msg.role === 'user');
          
          if (userMessageIndex !== -1) {
            // Add image to the first user message
            const userMsg = processedMessages[userMessageIndex];
            
            // Create a content array with text and image
            processedMessages[userMessageIndex] = {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: `This is a math problem shown in the image. ${userMsg.content}`
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            };
          } else {
            // If no user message found, add a new one with the image
            processedMessages.push({
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: 'Please analyze this math problem shown in the image:'
                },
                {
                  type: 'image_url',
                  image_url: {
                    url: base64Image
                  }
                }
              ]
            });
          }
          
          // Add image analysis instructions to system message
          const systemInstructions = imageUrl ? `
You are analyzing a math problem shown in an image.
Your output must be a single valid JSON object containing these fields:
{
  "questionText": "the full question text",
  "options": ["array of options if multiple choice"],
  "correctAnswer": "the correct answer if indicated",
  "optionStyle": "A-D" or "F-J" or "text"
}

Do not include any text before or after the JSON object.` : `
You are a helpful AI tutor. Provide clear, encouraging feedback.`;

          // Find system message or add one
          const sysIndex = processedMessages.findIndex(msg => msg.role === 'system');
          if (sysIndex !== -1) {
            processedMessages[sysIndex].content = systemInstructions;
          } else {
            processedMessages.unshift({
              role: 'system',
              content: systemInstructions
            });
          }
        }
      }
    }
    
    // Prepare the request body
    const requestBody: any = {
      model: model,
      messages: processedMessages,
      temperature: temperature
    };
    
    // For OpenRouter, add response format for structured output
    if (endpoint.includes('openrouter.ai') && imageUrl) {
      requestBody.response_format = { type: "text" };
    }
    
    // Log the request for debugging (without the full base64 string)
    const debugRequestBody = { ...requestBody };
    if (base64Image && debugRequestBody.messages) {
      debugRequestBody.messages = debugRequestBody.messages.map((msg: any) => {
        if (Array.isArray(msg.content)) {
          return {
            ...msg,
            content: msg.content.map((item: any) => {
              if (item.type === 'image_url') {
                return { ...item, image_url: { url: '[BASE64_IMAGE]' } };
              }
              return item;
            })
          };
        }
        return msg;
      });
    }
    console.log('Request body:', JSON.stringify(debugRequestBody, null, 2));
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin, // Required for OpenRouter.ai
        'X-Title': 'Teachnology' // Application name for OpenRouter.ai
      },
      body: JSON.stringify(requestBody),
    });
    
    // Parse response first to handle both error and success cases
    const data = await response.json();
    console.log('OpenRouter raw response:', data);

    // If there's an error property in the response, handle it first
    if (data.error) {
      console.error('OpenRouter API error:', data.error);
      const errorMessage = data.error.message || data.error.type || 'Unknown OpenRouter error';
      throw new Error(`OpenRouter API error: ${errorMessage}`);
    }

    if (!response.ok) {
      console.error('API response error:', data);
      console.error('Response status:', response.status);
      throw new Error(`API request failed with status ${response.status}: ${data.error?.message || 'Unknown error'}`);
    }
    
    let content = null;
    
    if (!data || typeof data !== 'object') {
      console.error('Invalid API response:', data);
      throw new Error('Invalid API response format');
    }
    
    try {
      if (endpoint.includes('openrouter.ai')) {
        // Enhanced error checking for OpenRouter format
        if (!data.choices) {
          throw new Error('OpenRouter response is missing choices array');
        }
        
        if (!Array.isArray(data.choices) || data.choices.length === 0) {
          throw new Error('OpenRouter response has empty choices array');
        }
        
        const choice = data.choices[0];
        if (!choice) {
          throw new Error('No choice available in OpenRouter response');
        }

        // Handle both message and delta formats
        const messageContent = choice.message?.content || choice.delta?.content;
        
        if (Array.isArray(choice.message?.content)) {
          // Handle array content format (e.g., for vision models)
          const textContent = choice.message.content.find(item => 
            item.type === 'text' && item.text
          );
          content = textContent?.text || null;
        } else {
          // Handle string content format
          content = messageContent;
        }
        
        if (content === null || content === undefined) {
          throw new Error('No valid content found in OpenRouter response');
        }
        
        console.log('Successfully extracted content:', content);
      } else if (endpoint.includes('openai.com')) {
        if (!data.choices?.[0]?.message?.content) {
          console.error('Invalid OpenAI response format:', data);
          throw new Error('Invalid OpenAI response format');
        }
        content = data.choices[0].message.content;
        console.log('Extracted content from OpenAI format:', content);
      } else {
        // Generic fallback for other APIs
        content = data.choices?.[0]?.message?.content || 
                 data.choices?.[0]?.text || 
                 data.response || 
                 data.output;
                  
        if (content === null || content === undefined) {
          console.error('No valid content found in response:', data);
          throw new Error('No valid content found in API response');
        }
        
        console.log('Extracted content from generic format:', content);
      }
      
      return content;
    } catch (error) {
      console.error('Error extracting content from response:', error);
      throw new Error(`Failed to extract content from API response: ${error.message}`);
    }
  } catch (error) {
    // Enhanced error logging
    console.error('Error in fetchChatCompletion:', {
      error,
      endpoint,
      model,
      messageCount: messages.length
    });
    
    // Rethrow with a more user-friendly message if it's an OpenRouter error
    if (error.message.includes('OpenRouter API error:')) {
      throw new Error('Failed to get AI response. Please check your API key and try again.');
    }
    throw error;
  }
}

/**
 * Saves a chat message to the database
 */
export async function saveChatMessage({
  sessionId,
  slideId,
  blockId,
  userId,
  role,
  content
}: {
  sessionId: string;
  slideId: string;
  blockId: string;
  userId: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        session_id: sessionId,
        slide_id: slideId,
        block_id: blockId,
        user_id: userId,
        role,
        content,
        created_at: new Date().toISOString()
      });
      
    if (error) {
      console.error('Error saving chat message:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveChatMessage:', error);
    return false;
  }
}

/**
 * Retrieves chat history for a specific block in a session
 */
export async function getChatHistory({
  sessionId,
  blockId,
  userId
}: {
  sessionId: string;
  blockId: string;
  userId: string;
}) {
  try {
    const { data, error } = await supabase
      .from('chat_messages')
      .select('*')
      .eq('session_id', sessionId)
      .eq('block_id', blockId)
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
      
    if (error) {
      console.error('Error retrieving chat history:', error);
      return [];
    }
    
    return data.map(message => ({
      role: message.role,
      content: message.content
    }));
  } catch (error) {
    console.error('Error in getChatHistory:', error);
    return [];
  }
}

/**
 * Fetches available models from OpenRouter API
 */
export async function fetchAvailableModels(): Promise<{ id: string; name: string }[] | null> {
  try {
    // Get the API key from user settings
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) {
      console.error('Error getting current user:', userError);
      throw new Error('Failed to get current user');
    }
    
    if (!user?.id) {
      console.error('No user ID found');
      throw new Error('No user found');
    }

    // First try to get API key from user settings
    let apiKey = await getOpenRouterApiKey(user.id);
    
    // If no API key found, try to get teacher's API key from the presentation settings
    if (!apiKey) {
      // Get session ID from URL, handling both full URLs and path segments
      const pathSegments = window.location.pathname.split('/');
      const sessionId = pathSegments[pathSegments.length - 1];
      
      console.log('No user API key found, checking presentation settings for session:', sessionId);

      if (sessionId && sessionId.length > 0) {
        try {
          // Query the presentation_settings table directly using session_id
          const { data: settings, error: settingsError } = await supabase
            .from('presentation_settings')
            .select('openrouter_api_key')
            .eq('session_id', sessionId)
            .single();

          if (settingsError) {
            console.error('Error getting presentation settings:', settingsError);
          } else if (settings?.openrouter_api_key) {
            apiKey = settings.openrouter_api_key;
            console.log('Successfully retrieved API key from presentation settings');
          }
        } catch (err) {
          console.error('Error in presentation settings lookup:', err);
        }
      }
    }

    if (!apiKey) {
      throw new Error('No API key found. Please add your OpenRouter API key in Settings or use a presentation with an API key configured.');
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Teachnology'
      }
    });

    if (!response.ok) {
      console.error('Failed to fetch models:', response.statusText);
      return null;
    }

    const data = await response.json();
    
    // Format the models data for easier use in dropdowns
    return data.data.map((model: any) => ({
      id: model.id,
      name: model.name || model.id.split('/').pop(),
      context_length: model.context_length,
      pricing: model.pricing
    }));
  } catch (error) {
    console.error('Error fetching models:', error);
    return null;
  }
}

export interface ImageAnalysisResult {
  questionText: string;
  options?: string[];
  correctAnswer?: string;
  optionStyle?: 'A-D' | 'F-J' | 'text';
}

export const analyzeQuestionImage = async (
  imageUrl: string,
  model: string = 'openai/gpt-4o-mini'
): Promise<ImageAnalysisResult> => {
  const systemPrompt = `You are an AI assistant helping analyze math problem images.
Your task is to examine the image and extract:
1. The question text (use LaTeX notation for mathematical expressions, e.g. \\( x^2 \\) for inline and \\[ \\frac{1}{2} \\] for display)
2. The answer choices (if multiple choice) with proper LaTeX formatting
3. Determine which lettering system is used (A-D or F-J) if present
4. The correct answer if marked or indicated

Return the result in valid JSON format with these fields:
{
  "questionText": "the full question text with LaTeX notation",
  "options": ["array of options with LaTeX notation"],
  "correctAnswer": "the correct answer with LaTeX if needed",
  "optionStyle": "A-D" or "F-J" or "text"
}

Important: For mathematical expressions:
- Use \\( and \\) for inline math
- Use \\[ and \\] for display math
- Format fractions as \\frac{numerator}{denominator}
- Format exponents as x^{power}
- Format subscripts as x_{subscript}
Your response must be a single valid JSON object without any additional text.`;

  try {
    const response = await fetchChatCompletion({
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Please analyze this math problem image and extract the required information with proper mathematical notation.' }
      ],
      model,
      endpoint: 'https://openrouter.ai/api/v1/chat/completions',
      imageUrl
    });

    if (!response) {
      throw new Error('No response from AI service');
    }

    // Try to parse the JSON from the response
    try {
      // First try direct parse
      try {
        return JSON.parse(response);
      } catch {
        // If that fails, try to extract JSON from the response
        const jsonRegex = /{[\s\S]*}/;
        const match = response.match(jsonRegex);
        
        if (!match) {
          throw new Error('No JSON object found in response');
        }
        
        const jsonStr = match[0];
        const result = JSON.parse(jsonStr);
        
        // Validate the parsed result has required fields
        if (!result.questionText) {
          throw new Error('Invalid response format: missing questionText');
        }
        
        return result;
      }
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError);
      throw new Error('Failed to parse image analysis results');
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

// Function to get API key, prioritizing session settings for students
const getApiKey = async (sessionId?: string) => {
  // First check session settings if we have a session ID
  if (sessionId) {
    const { data: sessionData } = await supabase
      .from('presentation_sessions')
      .select('settings')
      .eq('id', sessionId)
      .single();

    if (sessionData?.settings?.openrouterApiKey) {
      return sessionData.settings.openrouterApiKey;
    }
  }

  // Fall back to user settings if no session key found
  const { data: userSettings } = await supabase
    .from('user_settings')
    .select('openrouter_api_key')
    .single();

  return userSettings?.openrouter_api_key;
};

// Update fetchChatCompletion to accept sessionId
export const fetchChatCompletion = async (
  messages: ChatMessage[], 
  options: ChatOptions,
  sessionId?: string
): Promise<ChatMessage> => {
  const apiKey = await getApiKey(sessionId);
  if (!apiKey) {
    throw new Error('No API key found. Please add your OpenRouter API key in Settings.');
  }
  // ...rest of the existing function...
};
