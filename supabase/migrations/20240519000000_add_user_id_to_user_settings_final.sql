-- Add user_id column to user_settings table
ALTER TABLE public.user_settings ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Update existing rows with user_id from id column if needed
UPDATE public.user_settings SET user_id = id WHERE user_id IS NULL;

-- Make user_id not nullable and add unique constraint
ALTER TABLE public.user_settings 
  ALTER COLUMN user_id SET NOT NULL,
  ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);

-- Add index for faster lookups
CREATE INDEX user_settings_user_id_idx ON public.user_settings(user_id);