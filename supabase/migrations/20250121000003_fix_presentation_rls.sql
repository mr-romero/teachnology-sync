-- Fix RLS policies for presentations to check both teacher_id and user_id

-- Drop existing policies
DROP POLICY IF EXISTS "Anyone can read presentations" ON public.presentations;
DROP POLICY IF EXISTS "Teachers can manage their presentations" ON public.presentations;

-- Recreate with proper checks for both columns
CREATE POLICY "Anyone can read presentations" ON public.presentations
  FOR SELECT USING (true);

CREATE POLICY "Teachers can insert presentations" ON public.presentations
  FOR INSERT WITH CHECK (auth.uid() = user_id OR auth.uid() = teacher_id);

CREATE POLICY "Teachers can update presentations" ON public.presentations
  FOR UPDATE USING (auth.uid() = user_id OR auth.uid() = teacher_id);

CREATE POLICY "Teachers can delete presentations" ON public.presentations
  FOR DELETE USING (auth.uid() = user_id OR auth.uid() = teacher_id);

-- Also fix slides policy to allow insert
DROP POLICY IF EXISTS "Teachers can manage slides" ON public.slides;

CREATE POLICY "Teachers can insert slides" ON public.slides
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.presentations p 
      WHERE p.id = slides.presentation_id 
      AND (p.teacher_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

CREATE POLICY "Teachers can update slides" ON public.slides
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.presentations p 
      WHERE p.id = slides.presentation_id 
      AND (p.teacher_id = auth.uid() OR p.user_id = auth.uid())
    )
  );

CREATE POLICY "Teachers can delete slides" ON public.slides
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.presentations p 
      WHERE p.id = slides.presentation_id 
      AND (p.teacher_id = auth.uid() OR p.user_id = auth.uid())
    )
  );
