-- Add submitted_at column to student_answers
ALTER TABLE public.student_answers ADD COLUMN IF NOT EXISTS submitted_at timestamp with time zone DEFAULT now();

-- Create index for sorting
CREATE INDEX IF NOT EXISTS idx_student_answers_submitted_at ON public.student_answers(submitted_at);
