-- Add missing columns to presentations table
-- The lessonService expects 'user_id' and 'is_public' columns

-- Add user_id as an alias/duplicate of teacher_id for backward compatibility
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;

-- Copy teacher_id values to user_id
UPDATE public.presentations SET user_id = teacher_id WHERE user_id IS NULL;

-- Add is_public column
ALTER TABLE public.presentations ADD COLUMN IF NOT EXISTS is_public boolean DEFAULT false;

-- Create index for user_id lookups
CREATE INDEX IF NOT EXISTS idx_presentations_user_id ON public.presentations(user_id);
