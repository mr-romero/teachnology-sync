-- Add tts_settings column to user_settings if it doesn't exist
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS tts_settings jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS default_model text;
ALTER TABLE public.user_settings ADD COLUMN IF NOT EXISTS openrouter_endpoint text DEFAULT 'https://openrouter.ai/api/v1/chat/completions';
