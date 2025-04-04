-- Add user_id column if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_schema = 'public' 
        AND table_name = 'user_settings' 
        AND column_name = 'user_id'
    ) THEN
        ALTER TABLE public.user_settings ADD COLUMN user_id uuid REFERENCES auth.users(id);
    END IF;
END $$;

-- Drop the constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'user_settings_user_id_unique' 
        AND conrelid = 'user_settings'::regclass
    ) THEN
        ALTER TABLE public.user_settings DROP CONSTRAINT user_settings_user_id_unique;
    END IF;
END $$;

-- Add the constraint
ALTER TABLE public.user_settings ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);