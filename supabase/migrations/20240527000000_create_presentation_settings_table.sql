-- Enable uuid-ossp extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create presentation_settings table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.presentation_settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    session_id uuid NOT NULL REFERENCES public.presentation_sessions(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    CONSTRAINT presentation_settings_session_id_key UNIQUE (session_id)
);

-- Add RLS policies
ALTER TABLE public.presentation_settings ENABLE ROW LEVEL SECURITY;

-- Add policies if they don't exist
DO $$ 
BEGIN
    -- Check and create teacher policy
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'presentation_settings' 
        AND policyname = 'Teachers can manage settings for their sessions'
    ) THEN
        CREATE POLICY "Teachers can manage settings for their sessions"
        ON public.presentation_settings
        USING (EXISTS (
            SELECT 1 
            FROM public.presentation_sessions ps
            JOIN public.presentations p ON ps.presentation_id = p.id
            WHERE ps.id = presentation_settings.session_id
            AND p.user_id = auth.uid()
        ));
    END IF;

    -- Check and create student policy
    IF NOT EXISTS (
        SELECT 1 
        FROM pg_policies 
        WHERE tablename = 'presentation_settings' 
        AND policyname = 'Students can read settings for their sessions'
    ) THEN
        CREATE POLICY "Students can read settings for their sessions"
        ON public.presentation_settings FOR SELECT
        USING (EXISTS (
            SELECT 1 
            FROM public.session_participants sp
            WHERE sp.session_id = presentation_settings.session_id
            AND sp.user_id = auth.uid()
            AND sp.is_active = true
        ));
    END IF;
END $$;