-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION create_presentation_settings()
RETURNS TRIGGER AS $$
BEGIN
    -- Create presentation settings record for the new session
    INSERT INTO public.presentation_settings (session_id)
    VALUES (NEW.id);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS ensure_presentation_settings ON public.presentation_sessions;

-- Create the trigger
CREATE TRIGGER ensure_presentation_settings
    AFTER INSERT ON public.presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION create_presentation_settings();