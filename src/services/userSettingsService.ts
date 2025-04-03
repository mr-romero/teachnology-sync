import { supabase } from '@/integrations/supabase/client';

export const getUserSettings = async (userId: string) => {
  try {
    console.log('Getting settings for user:', userId);
    // First try to get existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      console.error('Error getting user settings:', error);
      // If no settings exist, create new ones
      if (error.code === 'PGRST116') {
        console.log('No settings found, creating new settings...');
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ id: userId })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating user settings:', insertError);
          return null;
        }
        
        console.log('Created new settings:', newSettings);
        return newSettings;
      }
      
      return null;
    }

    console.log('Retrieved settings:', data);
    return data;
  } catch (error) {
    console.error('Exception in getUserSettings:', error);
    return null;
  }
};

export const updateUserSettings = async (userId: string, settings: Partial<{
  openrouter_api_key: string;
  settings: Record<string, any>;
}>) => {
  try {
    console.log('Updating settings for user:', userId);
    // First ensure the user has a settings record
    const currentSettings = await getUserSettings(userId);
    
    if (!currentSettings) {
      console.error('No settings record found to update');
      return false;
    }

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

    console.log('Settings updated successfully');
    return true;
  } catch (error) {
    console.error('Exception in updateUserSettings:', error);
    return false;
  }
};

export const ensureUserSettings = async (userId: string) => {
  try {
    // Check if settings exist
    const { data: existingSettings, error: checkError } = await supabase
      .from('user_settings')
      .select('id')
      .eq('id', userId)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      // Settings don't exist, create them
      const { error: createError } = await supabase
        .from('user_settings')
        .insert({ id: userId });
        
      if (createError) {
        console.error('Error creating user settings:', createError);
        return false;
      }
      return true;
    }
    
    return true;
  } catch (error) {
    console.error('Error in ensureUserSettings:', error);
    return false;
  }
};

export const getOpenRouterApiKey = async (userId: string): Promise<string | null> => {
  try {
    // First ensure settings exist
    await ensureUserSettings(userId);

    // Then get the API key
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('openrouter_api_key')
      .eq('id', userId)
      .single();
      
    if (error) {
      console.error('Error getting OpenRouter API key:', error);
      return null;
    }
    
    return settings?.openrouter_api_key || null;
  } catch (error) {
    console.error('Error in getOpenRouterApiKey:', error);
    return null;
  }
};

export const saveOpenRouterApiKey = async (userId: string, apiKey: string): Promise<boolean> => {
  try {
    // First ensure settings exist
    await ensureUserSettings(userId);

    // Then update the API key
    const { error } = await supabase
      .from('user_settings')
      .update({ openrouter_api_key: apiKey })
      .eq('id', userId);
      
    if (error) {
      console.error('Error saving OpenRouter API key:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('Error in saveOpenRouterApiKey:', error);
    return false;
  }
};