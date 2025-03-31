import { supabase } from "@/integrations/supabase/client";

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

interface FetchChatCompletionParams {
  messages: { role: string; content: string }[];
  model?: string;
  temperature?: number;
  endpoint?: string;
  apiKey?: string;
  maxTokens?: number;
}

/**
 * Fetches a chat completion from the specified AI model provider
 */
export async function fetchChatCompletion({
  messages,
  model = 'openai/gpt-3.5-turbo',
  temperature = 0.7,
  endpoint = 'https://openrouter.ai/api/v1/chat/completions',
  apiKey,
  maxTokens = 1000
}: FetchChatCompletionParams): Promise<string | null> {
  try {
    // Get API key from environment if not provided
    const key = apiKey || process.env.REACT_APP_OPENROUTER_API_KEY || '';
    
    if (!key) {
      console.error('No API key provided for AI chat');
      return null;
    }
    
    console.log(`Making request to ${endpoint} with model ${model}, max tokens: ${maxTokens}`);
    
    const requestBody = {
      model: model,
      messages: messages,
      temperature: temperature,
      max_tokens: maxTokens
    };
    
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${key}`,
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
    
    // Handle different API response formats
    let content = null;
    
    if (endpoint.includes('openrouter.ai')) {
      // OpenRouter.ai format
      content = data.choices[0]?.message?.content;
      console.log('Extracted content from OpenRouter format:', content);
    } else if (endpoint.includes('openai.com')) {
      // OpenAI format
      content = data.choices[0]?.message?.content;
      console.log('Extracted content from OpenAI format:', content);
    } else {
      // Generic format - try to extract content from first choice
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
export async function fetchAvailableModels(apiKey: string): Promise<{ id: string; name: string }[] | null> {
  try {
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