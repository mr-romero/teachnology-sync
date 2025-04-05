-- Disable RLS temporarily
ALTER TABLE public.presentation_settings DISABLE ROW LEVEL SECURITY;

-- Grant necessary permissions to the trigger function owner
GRANT ALL ON public.presentation_settings TO postgres;