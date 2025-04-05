-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_create_presentation_settings ON public.presentation_sessions;
DROP FUNCTION IF EXISTS public.handle_presentation_session_insert();

-- Create function to handle presentation settings creation
CREATE OR REPLACE FUNCTION public.handle_presentation_session_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert settings record using the same transaction with ON CONFLICT DO NOTHING
    INSERT INTO public.presentation_settings (session_id)
    VALUES (NEW.id)
    ON CONFLICT (session_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant necessary permissions
GRANT INSERT ON public.presentation_settings TO postgres, authenticated, anon;

-- Create new trigger that runs AFTER INSERT
CREATE TRIGGER tr_create_presentation_settings
    AFTER INSERT ON public.presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_presentation_session_insert();