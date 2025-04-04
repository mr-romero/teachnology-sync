-- First make sure we have the uuid-ossp extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Fix the id column to have a default value
ALTER TABLE public.user_settings 
    ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- First, delete any rows with null user_id as they are invalid
DELETE FROM public.user_settings 
WHERE user_id IS NULL;

-- Now we can safely make user_id required
ALTER TABLE public.user_settings 
    ALTER COLUMN user_id SET NOT NULL;

-- Add foreign key constraint if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_settings_user_id_fkey'
    ) THEN
        ALTER TABLE public.user_settings 
            ADD CONSTRAINT user_settings_user_id_fkey 
            FOREIGN KEY (user_id) 
            REFERENCES auth.users(id) 
            ON DELETE CASCADE;
    END IF;
END $$;