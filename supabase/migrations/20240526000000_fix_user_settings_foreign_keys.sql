-- Drop the incorrect foreign key constraint on id column
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_settings_id_fkey'
        AND table_name = 'user_settings'
    ) THEN
        ALTER TABLE user_settings DROP CONSTRAINT user_settings_id_fkey;
    END IF;
END $$;

-- Drop existing foreign key on user_id if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_settings_user_id_fkey'
        AND table_name = 'user_settings'
    ) THEN
        ALTER TABLE user_settings DROP CONSTRAINT user_settings_user_id_fkey;
    END IF;
END $$;

-- Drop existing unique constraint if it exists
DO $$ 
BEGIN
    IF EXISTS (
        SELECT 1 
        FROM information_schema.table_constraints 
        WHERE constraint_name = 'user_settings_user_id_key'
        AND table_name = 'user_settings'
    ) THEN
        ALTER TABLE user_settings DROP CONSTRAINT user_settings_user_id_key;
    END IF;
END $$;

-- Make id column simply a UUID with default
ALTER TABLE user_settings 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Add proper foreign key constraint for user_id
ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;

-- Add unique constraint on user_id to ensure one settings record per user
ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_key 
UNIQUE (user_id);