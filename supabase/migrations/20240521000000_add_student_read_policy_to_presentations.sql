-- Add policy to allow students to read presentation settings
CREATE POLICY "Students can view settings for sessions they participate in"
ON public.presentation_settings FOR SELECT
USING (EXISTS (
    SELECT 1 
    FROM public.session_participants sp
    JOIN public.presentation_sessions ps ON sp.session_id = ps.id
    WHERE ps.id = presentation_settings.session_id
    AND sp.user_id = auth.uid()
    AND sp.is_active = true
));

-- Add similar policy for the presentations table
CREATE POLICY "Students can view presentations for sessions they participate in"
ON public.presentations FOR SELECT
USING (EXISTS (
    SELECT 1 
    FROM public.session_participants sp
    JOIN public.presentation_sessions ps ON sp.session_id = ps.id
    WHERE ps.presentation_id = presentations.id
    AND sp.user_id = auth.uid()
    AND sp.is_active = true
));