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
    
    // Handle different response formats
    if (endpoint.includes('openrouter.ai')) {
      // OpenRouter format
      return { text: data.choices[0]?.message?.content || "" };
    } else if (endpoint.includes('openai.com')) {
      // OpenAI format
      return { text: data.choices[0]?.message?.content || "" };
    } else {
      // Generic format - try to extract text from the response
      if (data.choices && data.choices[0]?.message?.content) {
        return { text: data.choices[0].message.content };
      } else if (data.response) {
        return { text: data.response };
      } else {
        console.warn("Unknown API response format:", data);
        return { text: JSON.stringify(data) };
      }
    }
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
  maxTokens?: number;
  imageUrl?: string;  // Add imageUrl parameter
}

/**
 * Fetches a chat completion from the specified AI model provider
 */
export async function fetchChatCompletion({
  messages,
  model = 'openai/gpt-4',
  temperature = 0.7,
  endpoint = 'https://openrouter.ai/api/v1/chat/completions',
  maxTokens = 1000,
  imageUrl
}: FetchChatCompletionParams): Promise<string | null> {
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
      
      if (sessionId && sessionId.length > 0) {
        console.log('Looking up presentation settings for session:', sessionId);
        // First try to get the presentation session to verify it exists
        const { data: session, error: sessionError } = await supabase
          .from('presentation_sessions')
          .select('id')
          .eq('id', sessionId)
          .maybeSingle();

        if (session) {
          // If session exists, get its settings
          const { data: presentationSettings, error: settingsError } = await supabase
            .from('presentation_settings')
            .select('openrouter_api_key')
            .eq('session_id', sessionId)
            .maybeSingle();
            
          if (settingsError && settingsError.code !== 'PGRST116') {
            // Only log error if it's not the "no rows" error
            console.error('Error getting presentation settings:', settingsError);
          } else {
            console.log('Found presentation settings:', presentationSettings);
          }
          
          if (presentationSettings?.openrouter_api_key) {
            apiKey = presentationSettings.openrouter_api_key;
            console.log('Using API key from presentation settings');
          }
        } else {
          console.log('Session not found:', sessionId);
        }
      } else {
        console.log('No session ID found in URL:', window.location.pathname);
      }
    }
    
    if (!apiKey) {
      throw new Error('No API key found. Please add your OpenRouter API key in Settings.');
    }

    console.log(`Making request to ${endpoint} with model ${model}, max tokens: ${maxTokens}`);
    
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
          const systemInstructions = `
You are analyzing a math problem shown in an image. 
When providing feedback:
1. First describe what you see in the image (the math problem)
2. Analyze if the student's answer is correct
3. Provide a detailed explanation of the solution
4. Format your response as a JSON object with these fields:
   - image_content: description of the math problem in the image
   - question: the question that was asked
   - student_answer: what the student answered
   - correct_answer: the correct answer
   - explanation: detailed explanation of how to solve it
   - is_correct: boolean indicating if student was correct
5. After the JSON, provide helpful feedback to the student
6. Offer to create a similar practice problem if they want more practice`;
          
          // Find system message or add one
          const sysIndex = processedMessages.findIndex(msg => msg.role === 'system');
          if (sysIndex !== -1) {
            processedMessages[sysIndex].content += `\n\n${systemInstructions}`;
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
      temperature: temperature,
      max_tokens: maxTokens
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
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('API response error:', errorData);
      console.error('Response status:', response.status);
      throw new Error(`API request failed with status ${response.status}: ${errorData.error?.message || 'Unknown error'}`);
    }
    
    const data = await response.json();
    console.log('API Response data:', data);
    
    let content = null;
    
    if (endpoint.includes('openrouter.ai')) {
      content = data.choices[0]?.message?.content;
      console.log('Extracted content from OpenRouter format:', content);
    } else if (endpoint.includes('openai.com')) {
      content = data.choices[0]?.message?.content;
      console.log('Extracted content from OpenAI format:', content);
    } else {
      content = data.choices?.[0]?.message?.content || 
               data.choices?.[0]?.text || 
               data.response || 
               data.output;
      console.log('Extracted content from generic format:', content);
    }
    
    if (!content) {
      console.error('No content found in response:', data);
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

    const apiKey = await getOpenRouterApiKey(user.id);
    if (!apiKey) {
      throw new Error('No API key found. Please add your OpenRouter API key in Settings.');
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
