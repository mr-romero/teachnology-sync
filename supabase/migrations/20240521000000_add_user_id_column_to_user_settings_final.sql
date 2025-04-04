-- Add user_id column to user_settings table
ALTER TABLE user_settings ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Set NOT NULL constraint
ALTER TABLE user_settings ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint to prevent duplicate settings per user
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);