-- Migrate existing data by copying id to user_id where it's not set
UPDATE user_settings 
SET user_id = id 
WHERE user_id IS NULL;

-- Backfill any missing user settings for existing users
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM user_settings WHERE user_settings.user_id = auth.users.id
);