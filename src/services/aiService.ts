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

// Define interfaces at the top
interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string | ContentItem[];
}

interface ChatOptions {
  model?: string;
  temperature?: number;
  endpoint?: string;
  imageUrl?: string;
}

type ContentItem = 
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string } };

// Unified fetchChatCompletion implementation
export async function fetchChatCompletion(
  options: {
    messages: ChatMessage[];
    model?: string;
    endpoint?: string;
    temperature?: number;
    imageUrl?: string;
  },
  sessionId?: string
): Promise<string | null> {
  const {
    messages,
    model = 'mistralai/mistral-small-3.1-24b-instruct:free', // Updated default model
    temperature = 0.7,
    endpoint = 'https://openrouter.ai/api/v1/chat/completions',
    imageUrl
  } = options;

  try {
    // Get the API key using the getApiKey helper
    const apiKey = await getApiKey(sessionId);
    if (!apiKey) {
      throw new Error('No API key found. Please add your OpenRouter API key in Settings or use a presentation with an API key configured.');
    }

    // Process messages to include image if provided
    let processedMessages = [...messages];
    let base64Image: string | null = null;
    
    if (imageUrl) {
      console.log('Processing image for LLM:', imageUrl);
      base64Image = await getImageAsBase64(imageUrl);
      
      if (!base64Image) {
        console.error('Failed to convert image to base64');
      } else {
        console.log('Successfully converted image to base64');
        
        if (endpoint.includes('openrouter.ai')) {
          const userMessageIndex = processedMessages.findIndex(msg => msg.role === 'user');
          
          if (userMessageIndex !== -1) {
            const userMsg = processedMessages[userMessageIndex];
            processedMessages[userMessageIndex] = {
              role: 'user',
              content: [
                {
                  type: 'text',
                  text: typeof userMsg.content === 'string' 
                    ? `This is a math problem shown in the image. ${userMsg.content}`
                    : 'This is a math problem shown in the image.'
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
        }
      }
    }

    // Prepare request
    const requestBody = {
      model,
      messages: processedMessages,
      temperature
    };

    // Make request
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Teachnology'
      },
      body: JSON.stringify(requestBody)
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      const errorMessage = data.error?.message || `API request failed with status ${response.status}`;
      throw new Error(errorMessage);
    }

    // Extract content from response
    let content = null;

    if (endpoint.includes('openrouter.ai')) {
      if (!data.choices?.[0]) {
        throw new Error('Invalid OpenRouter response format');
      }

      const choice = data.choices[0];
      if (Array.isArray(choice.message?.content)) {
        const textContent = choice.message.content.find(item => 
          item.type === 'text' && item.text
        );
        content = textContent?.text || null;
      } else {
        content = choice.message?.content || choice.delta?.content;
      }
    } else {
      content = data.choices?.[0]?.message?.content || 
               data.choices?.[0]?.text || 
               data.response || 
               data.output;
    }

    // Log the raw data and the extracted content before the check
    console.log('[fetchChatCompletion] Raw API response data:', JSON.stringify(data, null, 2));
    console.log('[fetchChatCompletion] Extracted content before check:', content);

    if (content === null || content === undefined || content === '') { // Check for null, undefined, or empty string
      console.error('[fetchChatCompletion] No valid content extracted from response.'); // Log specific reason
      throw new Error('No valid content found in API response');
    }

    return content;
  } catch (error) {
    console.error('Error in fetchChatCompletion:', error);
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
    // Get session ID from URL, handling both full URLs and path segments
    const pathSegments = window.location.pathname.split('/');
    const sessionId = pathSegments[pathSegments.length - 1];

    // Use our getApiKey helper that will check both presentation and user settings
    const apiKey = await getApiKey(sessionId);
    
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
  model: string = 'mistralai/mistral-small-3.1-24b-instruct:free'
): Promise<ImageAnalysisResult> => {
  const systemPrompt = `You are an AI assistant helping analyze math problem images.
Your task is to examine the image and extract:
1. The question text with mathematical expressions properly formatted in LaTeX
2. The answer choices (if multiple choice) with proper LaTeX formatting
3. Determine which lettering system is used (A-D or F-J) if present
4. The correct answer if marked or indicated

Return the result in valid JSON format with these fields:
{
  "questionText": "the full question text",
  "options": ["array of options"],
  "correctAnswer": "the correct answer",
  "optionStyle": "A-D" or "F-J" or "text"
}

Important LaTeX formatting rules:
- ALL mathematical expressions MUST be wrapped in LaTeX delimiters
- Use \\\\( and \\\\) for inline math expressions (within text)
- Use \\\\[ and \\\\] for standalone display equations
- Even simple expressions like x^2 must be wrapped: "Find \\\\(x^2\\\\) when..."
- Variable references like f(x) should be wrapped: "If \\\\(f(x)\\\\) equals..."
- Multiple expressions in a sentence need separate wrapping: "If \\\\(x = 5\\\\) and \\\\(y = 3\\\\), find..."

Examples:
- Question with inline math: "If \\\\(f(x) = 6x^2 - 23x + 21\\\\), find the factors."
- Answer with display math: "\\\\[f(x) = 3(x - 7)(2x - 1)\\\\]"
- Multiple choice with LaTeX: ["\\\\(3x + 4\\\\)", "\\\\(3x - 4\\\\)", "\\\\(4x + 3\\\\)", "\\\\(4x - 3\\\\)"]

Return only the JSON object, no additional text or markdown.`;

  try {
    const response = await fetchChatCompletion(
      {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: 'Please analyze this math problem image and extract the required information.' }
        ],
        model,
        endpoint: 'https://openrouter.ai/api/v1/chat/completions',
        imageUrl
      }
    );

    if (!response) {
      throw new Error('No response from AI service');
    }

    // Clean and parse the response
    try {
      // Remove markdown code block markers if present
      const cleanResponse = response.replace(/```json\n?|\n?```/g, '');
      
      // Remove any non-JSON text before or after the JSON object
      const jsonStr = cleanResponse.replace(/^[^{]*({.*})[^}]*$/s, '$1');
      
      // Replace any unescaped newlines and control characters
      const cleanedStr = jsonStr.replace(/[\n\r\t]/g, ' ');
      
      const result = JSON.parse(cleanedStr);

      // Validate the parsed result has required fields
      if (!result.questionText) {
        throw new Error('Invalid response format: missing questionText');
      }

      return result;
    } catch (parseError) {
      console.error('Error parsing AI response:', parseError, '\nResponse:', response);
      throw new Error('Failed to parse image analysis results');
    }
  } catch (error) {
    console.error('Error analyzing image:', error);
    throw error;
  }
};

// Function to get API key, prioritizing session settings for students
const getApiKey = async (sessionId?: string): Promise<string | null> => {
  try {
    // If we have a sessionId, try to get teacher's key from the presentation first
    if (sessionId) {
      console.log('Getting API key for session:', sessionId);
      
      // Get API key directly from presentation_settings using sessionId
      const { data: settingsData, error: settingsError } = await supabase
        .from('presentation_settings')
        .select('openrouter_api_key')
        .eq('session_id', sessionId)
        .maybeSingle();
      
      if (settingsError) {
        console.error('Error getting presentation settings:', settingsError);
      } else if (settingsData?.openrouter_api_key) {
        return settingsData.openrouter_api_key;
      }
    }
    
    // If no session key found, try to get user's own API key as fallback
    const { data: { user } } = await supabase.auth.getUser();
    if (user?.id) {
      const userKey = await getOpenRouterApiKey(user.id);
      if (userKey) return userKey;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getApiKey:', error);
    return null;
  }
};
