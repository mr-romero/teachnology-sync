-- Add settings column to presentations and create slides table

-- Add settings column to presentations (stores JSON settings like showCalculator)
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Create slides table for individual lesson slides
CREATE TABLE IF NOT EXISTS public.slides (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
  slide_order integer DEFAULT 0,
  content jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create student_answers table for storing quiz/response answers
CREATE TABLE IF NOT EXISTS public.student_answers (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.presentation_sessions(id) ON DELETE CASCADE NOT NULL,
  slide_id text NOT NULL,
  content_id text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  answer text NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Add settings column to presentation_settings if not exists
ALTER TABLE public.presentation_settings ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;
ALTER TABLE public.presentation_settings ADD COLUMN IF NOT EXISTS tts_settings jsonb DEFAULT '{}'::jsonb;

-- Add missing columns to session_participants
ALTER TABLE public.session_participants ADD COLUMN IF NOT EXISTS current_slide integer DEFAULT 0;
ALTER TABLE public.session_participants ADD COLUMN IF NOT EXISTS last_active_at timestamp with time zone;

-- Enable RLS
ALTER TABLE public.slides ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_answers ENABLE ROW LEVEL SECURITY;

-- Slides policies
DROP POLICY IF EXISTS "Anyone can read slides" ON public.slides;
CREATE POLICY "Anyone can read slides" ON public.slides
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Teachers can manage slides" ON public.slides;
CREATE POLICY "Teachers can manage slides" ON public.slides
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.presentations p 
      WHERE p.id = slides.presentation_id 
      AND (p.teacher_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

-- Student answers policies
DROP POLICY IF EXISTS "Students can insert their answers" ON public.student_answers;
CREATE POLICY "Students can insert their answers" ON public.student_answers
  FOR INSERT WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Teachers can read answers" ON public.student_answers;
CREATE POLICY "Teachers can read answers" ON public.student_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.presentation_sessions ps
      JOIN public.presentations p ON p.id = ps.presentation_id
      WHERE ps.id = student_answers.session_id
      AND (p.teacher_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_slides_presentation_id ON public.slides(presentation_id);
CREATE INDEX IF NOT EXISTS idx_slides_slide_order ON public.slides(slide_order);
CREATE INDEX IF NOT EXISTS idx_student_answers_session_id ON public.student_answers(session_id);

-- Grants
GRANT ALL ON public.slides TO authenticated;
GRANT ALL ON public.student_answers TO authenticated;
