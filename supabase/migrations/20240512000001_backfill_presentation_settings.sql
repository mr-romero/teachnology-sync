-- Insert settings for any existing presentation sessions that don't have them
INSERT INTO public.presentation_settings (session_id)
SELECT ps.id 
FROM public.presentation_sessions ps
LEFT JOIN public.presentation_settings pst ON ps.id = pst.session_id
WHERE pst.session_id IS NULL;