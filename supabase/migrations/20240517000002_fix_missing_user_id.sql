-- Add user_id column
ALTER TABLE user_settings ADD COLUMN IF NOT EXISTS user_id UUID NOT NULL REFERENCES auth.users(id);

-- Add index for performance
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Add a unique constraint to ensure one settings record per user
ALTER TABLE user_settings ADD CONSTRAINT user_settings_user_id_key UNIQUE (user_id);

-- Add trigger to ensure user_id is present
CREATE OR REPLACE FUNCTION check_user_settings_user_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.user_id IS NULL THEN
    RAISE EXCEPTION 'user_id cannot be null';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_user_settings_user_id
  BEFORE INSERT OR UPDATE ON user_settings
  FOR EACH ROW
  EXECUTE FUNCTION check_user_settings_user_id();
