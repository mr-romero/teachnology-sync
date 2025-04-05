-- First, let's make sure we clean up any duplicate settings
DELETE FROM presentation_settings a USING presentation_settings b
WHERE a.session_id = b.session_id 
AND a.id > b.id;

-- Create a function to ensure settings are created with the session
CREATE OR REPLACE FUNCTION public.handle_presentation_session_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Insert settings record using the same transaction
    INSERT INTO public.presentation_settings (session_id)
    VALUES (NEW.id)
    ON CONFLICT (session_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS tr_create_presentation_settings ON public.presentation_sessions;

-- Create new trigger
CREATE TRIGGER tr_create_presentation_settings
    AFTER INSERT ON public.presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_presentation_session_insert();

-- Add a unique constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_constraint 
        WHERE conname = 'presentation_settings_session_id_key'
    ) THEN
        ALTER TABLE public.presentation_settings
        ADD CONSTRAINT presentation_settings_session_id_key 
        UNIQUE (session_id);
    END IF;
END $$;