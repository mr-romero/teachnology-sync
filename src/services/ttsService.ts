import { Voice } from 'elevenlabs-node';
import { supabase } from '@/integrations/supabase/client';

interface TTSSettings {
  enabled: boolean;
  voice_id: string;
  auto_play: boolean;
  model_id?: string;
}

// Get TTS settings for a user
export const getTTSSettings = async (userId: string): Promise<TTSSettings> => {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('tts_settings')
      .eq('user_id', userId)
      .single();

    return settings?.tts_settings || {
      enabled: false,
      voice_id: 'pNInz6obpgDQGcFmaJgB', // Example ElevenLabs voice ID
      auto_play: false,
    };
  } catch (error) {
    console.error('Error getting TTS settings:', error);
    return {
      enabled: false,
      voice_id: 'pNInz6obpgDQGcFmaJgB',
      auto_play: false,
    };
  }
};

// Save TTS settings for a user
export const saveTTSSettings = async (
  userId: string,
  settings: TTSSettings
): Promise<boolean> => {
  try {
    const { error } = await supabase
      .from('user_settings')
      .update({ tts_settings: settings })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving TTS settings:', error);
    return false;
  }
};

// Get ElevenLabs API key
export const getElevenLabsApiKey = async (userId: string): Promise<string | null> => {
  try {
    const { data: settings } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();
    
    return settings?.settings?.elevenlabs_api_key || null;
  } catch (error) {
    console.error('Error getting ElevenLabs API key:', error);
    return null;
  }
};

// Save ElevenLabs API key
export const saveElevenLabsApiKey = async (
  userId: string,
  apiKey: string
): Promise<boolean> => {
  try {
    const { data: existingSettings } = await supabase
      .from('user_settings')
      .select('settings')
      .eq('user_id', userId)
      .single();

    const updatedSettings = {
      ...(existingSettings?.settings || {}),
      elevenlabs_api_key: apiKey
    };

    const { error } = await supabase
      .from('user_settings')
      .update({ settings: updatedSettings })
      .eq('user_id', userId);

    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Error saving ElevenLabs API key:', error);
    return false;
  }
};

// Text to speech conversion
export const textToSpeech = async (
  text: string,
  userId: string
): Promise<ArrayBuffer | null> => {
  try {
    const apiKey = await getElevenLabsApiKey(userId);
    if (!apiKey) {
      throw new Error('No ElevenLabs API key found');
    }

    const settings = await getTTSSettings(userId);
    if (!settings.enabled) {
      return null;
    }

    const voice = new Voice(apiKey, settings.voice_id);
    const audioBuffer = await voice.textToSpeech(text);
    return audioBuffer;
  } catch (error) {
    console.error('Error in text to speech conversion:', error);
    return null;
  }
};