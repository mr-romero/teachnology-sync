-- Add user_id column to user_settings table
ALTER TABLE user_settings ADD COLUMN user_id uuid REFERENCES auth.users(id) NOT NULL;

-- Create a unique constraint to ensure one settings record per user
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);