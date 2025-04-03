-- Create presentation settings table
CREATE TABLE IF NOT EXISTS public.presentation_settings (
    session_id uuid references public.presentation_sessions(id) on delete cascade primary key,
    openrouter_api_key text,
    settings jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Enable row level security
ALTER TABLE public.presentation_settings ENABLE ROW LEVEL SECURITY;

-- Create policy that allows users to view settings for sessions they teach
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Teachers can view their own presentation settings'
          AND tablename = 'presentation_settings'
    ) THEN
        CREATE POLICY "Teachers can view their own presentation settings"
        ON public.presentation_settings FOR SELECT
        USING (EXISTS (
            SELECT 1 
            FROM public.presentation_sessions ps
            JOIN public.presentations p ON ps.presentation_id = p.id
            WHERE ps.id = presentation_settings.session_id
            AND p.user_id = auth.uid()
        ));
    END IF;
END $$;

-- Create policy that allows users to update settings for sessions they teach
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Teachers can update their own presentation settings'
          AND tablename = 'presentation_settings'
    ) THEN
        CREATE POLICY "Teachers can update their own presentation settings"
        ON public.presentation_settings FOR UPDATE
        USING (EXISTS (
            SELECT 1 
            FROM public.presentation_sessions ps
            JOIN public.presentations p ON ps.presentation_id = p.id
            WHERE ps.id = presentation_settings.session_id
            AND p.user_id = auth.uid()
        ));
    END IF;
END $$;

-- Create policy that allows users to insert settings for sessions they teach
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Teachers can insert settings for their own sessions'
          AND tablename = 'presentation_settings'
    ) THEN
        CREATE POLICY "Teachers can insert settings for their own sessions"
        ON public.presentation_settings FOR INSERT
        WITH CHECK (EXISTS (
            SELECT 1 
            FROM public.presentation_sessions ps
            JOIN public.presentations p ON ps.presentation_id = p.id
            WHERE ps.id = session_id
            AND p.user_id = auth.uid()
        ));
    END IF;
END $$;

-- Create policy that allows service role to access all presentation settings
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies
        WHERE policyname = 'Service role full access'
          AND tablename = 'presentation_settings'
    ) THEN
        CREATE POLICY "Service role full access"
        ON public.presentation_settings
        USING (auth.role() = 'service_role');
    END IF;
END $$;

-- Create a function to handle new session creation
CREATE OR REPLACE FUNCTION public.handle_new_presentation_settings()
RETURNS trigger AS $$
DECLARE
    teacher_api_key TEXT;
BEGIN
    -- Fetch the teacher's API key from the user_settings table
    SELECT openrouter_api_key INTO teacher_api_key
    FROM public.user_settings
    WHERE id = (SELECT user_id FROM public.presentations WHERE id = NEW.presentation_id);

    -- Insert into presentation_settings with the teacher's API key
    INSERT INTO public.presentation_settings (session_id, openrouter_api_key)
    VALUES (NEW.id, teacher_api_key);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create a trigger to add settings when a session is created
DROP TRIGGER IF EXISTS on_presentation_session_created_settings ON public.presentation_sessions;
CREATE TRIGGER on_presentation_session_created_settings
    AFTER INSERT ON public.presentation_sessions
    FOR EACH ROW EXECUTE PROCEDURE public.handle_new_presentation_settings();