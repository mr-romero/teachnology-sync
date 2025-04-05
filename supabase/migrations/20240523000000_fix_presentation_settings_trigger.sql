-- First, let's drop existing trigger and constraints
DROP TRIGGER IF EXISTS tr_create_presentation_settings ON public.presentation_sessions;
DROP FUNCTION IF EXISTS public.handle_presentation_session_insert();

-- Drop the unique constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'presentation_settings_session_id_key'
    ) THEN
        ALTER TABLE public.presentation_settings DROP CONSTRAINT presentation_settings_session_id_key;
    END IF;
END $$;

-- Create a new function for the trigger that uses upsert instead of insert
CREATE OR REPLACE FUNCTION public.handle_presentation_session_insert()
RETURNS TRIGGER AS $$
BEGIN
    -- Use upsert to avoid conflicts
    INSERT INTO public.presentation_settings (session_id)
    VALUES (NEW.id)
    ON CONFLICT (session_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER tr_create_presentation_settings
    AFTER INSERT ON public.presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_presentation_session_insert();

-- Add a unique constraint (after cleaning up any duplicates)
DELETE FROM presentation_settings a USING presentation_settings b
WHERE a.session_id = b.session_id AND a.id > b.id;

ALTER TABLE public.presentation_settings ADD CONSTRAINT presentation_settings_session_id_key UNIQUE (session_id);