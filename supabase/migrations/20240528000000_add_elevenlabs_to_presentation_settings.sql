-- Add elevenlabs_api_key column to presentation_settings table
ALTER TABLE public.presentation_settings 
ADD COLUMN IF NOT EXISTS elevenlabs_api_key TEXT;

-- Grant access to the new column
GRANT ALL ON public.presentation_settings TO authenticated;
GRANT ALL ON public.presentation_settings TO service_role;