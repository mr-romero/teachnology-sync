import { supabase } from '@/integrations/supabase/client';

export const getUserSettings = async (userId: string) => {
  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error getting user settings:', error);
    return null;
  }

  return data;
};

export const updateUserSettings = async (userId: string, settings: Partial<{
  openrouter_api_key: string;
  settings: Record<string, any>;
}>) => {
  const { error } = await supabase
    .from('user_settings')
    .update({
      ...settings,
      updated_at: new Date().toISOString()
    })
    .eq('id', userId);

  if (error) {
    console.error('Error updating user settings:', error);
    return false;
  }

  return true;
};

export const getOpenRouterApiKey = async (userId: string): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .rpc('get_openrouter_api_key', { user_id: userId });

    if (error) {
      console.error('Error getting OpenRouter API key:', error);
      return null;
    }

    return data;
  } catch (error) {
    console.error('Exception in getOpenRouterApiKey:', error);
    return null;
  }
};