-- Add user_id column and make it a foreign key
ALTER TABLE user_settings ADD COLUMN user_id uuid REFERENCES profiles(id);

-- Make sure there's only one settings record per user
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_unique UNIQUE (user_id);

-- Ensure id is the primary key if not already set
ALTER TABLE user_settings DROP CONSTRAINT IF EXISTS user_settings_pkey;
ALTER TABLE user_settings ADD PRIMARY KEY (id);