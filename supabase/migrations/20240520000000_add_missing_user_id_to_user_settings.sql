-- Add user_id column to user_settings table
ALTER TABLE user_settings 
ADD COLUMN user_id uuid REFERENCES auth.users(id);

-- Add not null constraint after adding the column 
ALTER TABLE user_settings 
ALTER COLUMN user_id SET NOT NULL;

-- Add unique constraint on user_id
ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);

-- Create index for better query performance
CREATE INDEX idx_user_settings_user_id ON user_settings(user_id);