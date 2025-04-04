-- Safe drop of existing constraint if it exists
ALTER TABLE IF EXISTS public.user_settings
    DROP CONSTRAINT IF EXISTS user_settings_user_id_unique;

-- Safe drop of existing column if it exists
ALTER TABLE IF EXISTS public.user_settings
    DROP COLUMN IF EXISTS user_id;

-- Add the column
ALTER TABLE public.user_settings
    ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Add the constraint
ALTER TABLE public.user_settings
    ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);