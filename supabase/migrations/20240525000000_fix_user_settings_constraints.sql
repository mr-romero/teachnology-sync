-- Drop any existing foreign key constraints
ALTER TABLE user_settings 
DROP CONSTRAINT IF EXISTS user_settings_id_fkey;

-- Make sure id is just a UUID with default, not a foreign key
ALTER TABLE user_settings 
ALTER COLUMN id SET DEFAULT uuid_generate_v4();

-- Ensure the user_id foreign key is correct
ALTER TABLE user_settings 
DROP CONSTRAINT IF EXISTS user_settings_user_id_fkey;

ALTER TABLE user_settings 
ADD CONSTRAINT user_settings_user_id_fkey 
FOREIGN KEY (user_id) 
REFERENCES auth.users(id) 
ON DELETE CASCADE;