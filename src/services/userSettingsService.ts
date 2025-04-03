import { supabase } from '@/integrations/supabase/client';

export const getUserSettings = async (userId: string) => {
  try {
    // First try to get existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('id', userId)
      .single();

    if (error) {
      // If no settings exist, create new ones
      if (error.code === 'PGRST116') {
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ id: userId })
          .select()
          .single();
          
        if (insertError) {
          console.error('Error creating user settings:', insertError);
          return null;
        }
        
        return newSettings;
      }
      
      console.error('Error getting user settings:', error);
      return null;
    }

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
    // First ensure the user has a settings record
    const currentSettings = await getUserSettings(userId);
    
    if (!currentSettings) {
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

    return true;
  } catch (error) {
    console.error('Exception in updateUserSettings:', error);
    return false;
  }
};

export const getOpenRouterApiKey = async (userId: string): Promise<string | null> => {
  try {
    const settings = await getUserSettings(userId);
    return settings?.openrouter_api_key || null;
  } catch (error) {
    console.error('Exception in getOpenRouterApiKey:', error);
    return null;
  }
};