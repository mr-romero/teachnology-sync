import { supabase } from '@/integrations/supabase/client';

export const CELEBRATION_PRESETS = [
  { 
    id: 'superstar', 
    phrase: 'Superstar! 🌟', 
    effect: 'stars',
    sound: 'success',
    confetti: true
  },
  { 
    id: 'champion', 
    phrase: 'Champion! 🏆', 
    effect: 'gold',
    sound: 'chime',
    confetti: true
  },
  { 
    id: 'genius', 
    phrase: 'Genius Move! 🧠✨', 
    effect: 'rainbow',
    sound: 'applause',
    confetti: true
  },
  { 
    id: 'perfect', 
    phrase: 'Perfect! 💯', 
    effect: 'gold',
    sound: 'success',
    confetti: true
  },
  { 
    id: 'awesome', 
    phrase: 'Awesome! 🎯', 
    effect: 'stars',
    sound: 'chime',
    confetti: true
  },
  {
    id: 'brilliant',
    phrase: 'Brilliant work! ⭐',
    sound: 'chime',
    effect: 'gold'
  },
  {
    id: 'amazing',
    phrase: 'Amazing! 🌟',
    sound: 'success',
    effect: 'stars'
  },
  {
    id: 'perfect',
    phrase: 'Perfect score! 🎯',
    sound: 'applause',
    effect: 'rainbow'
  },
  {
    id: 'excellent',
    phrase: 'Excellent! 🏆',
    sound: 'chime',
    effect: 'gold'
  }
];

export interface CelebrationSettings {
  type: 'custom' | 'preset' | 'default';
  phrase?: string;
  emoji?: string;
  preset?: string;
  effects?: {
    confetti: boolean;
    sound: boolean;
    screenEffect: 'none' | 'gold' | 'stars' | 'rainbow';
  };
}

export interface UserSettings {
  id?: string;
  user_id: string;
  celebration_settings?: CelebrationSettings;
  openrouter_api_key?: string;
  settings?: Record<string, any>;
}

export const getUserSettings = async (userId: string): Promise<UserSettings | null> => {
  try {
    console.log('Getting settings for user:', userId);
    // First try to get existing settings
    const { data, error } = await supabase
      .from('user_settings')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting user settings:', error);
      // If no settings exist, create new ones
      if (error.code === 'PGRST116') {
        console.log('No settings found, creating new settings...');
        const newId = crypto.randomUUID(); // Generate a new UUID for the settings
        const { data: newSettings, error: insertError } = await supabase
          .from('user_settings')
          .insert({ 
            id: newId,
            user_id: userId,
            settings: {},
            celebration_settings: {
              type: 'default',
              effects: {
                confetti: true,
                sound: true,
                screenEffect: 'gold'
              }
            }
          })
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

export const updateUserSettings = async (
  userId: string, 
  settings: Partial<UserSettings>
): Promise<boolean> => {
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
      .upsert({
        user_id: userId,
        ...settings,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id'
      });

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
      .select('user_id')
      .eq('user_id', userId)
      .single();
    
    if (checkError && checkError.code === 'PGRST116') {
      // Settings don't exist, create them
      const newId = crypto.randomUUID();
      const { error: createError } = await supabase
        .from('user_settings')
        .insert({ 
          id: newId,
          user_id: userId,
          settings: {},
          celebration_settings: {
            type: 'default',
            effects: {
              confetti: true,
              sound: true,
              screenEffect: 'gold'
            }
          }
        });
        
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
    console.log('Fetching OpenRouter API key for user:', userId);
    // First ensure settings exist
    await ensureUserSettings(userId);
    // Then get the API key
    const { data: settings, error } = await supabase
      .from('user_settings')
      .select('openrouter_api_key')
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error getting OpenRouter API key:', error);
      return null;
    }

    console.log('Retrieved OpenRouter API key:', settings?.openrouter_api_key);
    return settings?.openrouter_api_key || null;
  } catch (error) {
    console.error('Error in getOpenRouterApiKey:', error);
    return null;
  }
};

export const saveOpenRouterApiKey = async (userId: string, apiKey: string): Promise<boolean> => {
  try {
    console.log('Saving OpenRouter API key for user:', userId, 'API Key:', apiKey);
    // First ensure settings exist
    await ensureUserSettings(userId);
    // Then update the API key
    const { error } = await supabase
      .from('user_settings')
      .update({ openrouter_api_key: apiKey })
      .eq('user_id', userId);

    if (error) {
      console.error('Error saving OpenRouter API key:', error);
      return false;
    }

    console.log('Successfully saved OpenRouter API key for user:', userId);
    return true;
  } catch (error) {
    console.error('Error in saveOpenRouterApiKey:', error);
    return false;
  }
};

// New function to get/set celebration settings
export const getCelebrationSettings = async (userId: string): Promise<UserSettings['celebration_settings']> => {
  const settings = await getUserSettings(userId);
  return settings?.celebration_settings || {
    type: 'default',
    effects: {
      confetti: true,
      sound: true,
      screenEffect: 'gold'
    }
  };
};

export const updateCelebrationSettings = async (
  userId: string,
  celebrationSettings: CelebrationSettings
): Promise<boolean> => {
  return updateUserSettings(userId, {
    user_id: userId,
    celebration_settings: celebrationSettings
  });
};