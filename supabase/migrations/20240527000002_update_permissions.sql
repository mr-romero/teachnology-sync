-- Enable RLS on both tables
ALTER TABLE public.presentation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT ALL ON public.presentation_sessions TO authenticated;
GRANT ALL ON public.presentation_settings TO authenticated;

-- Add RLS policy for authenticated users to manage their own sessions
CREATE POLICY "Users can manage their own sessions"
ON public.presentation_sessions
USING (
    EXISTS (
        SELECT 1 FROM public.presentations p
        WHERE p.id = presentation_sessions.presentation_id
        AND p.user_id = auth.uid()
    )
);