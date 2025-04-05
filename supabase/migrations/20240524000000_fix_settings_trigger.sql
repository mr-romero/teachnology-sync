-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS tr_create_presentation_settings ON presentation_sessions;
DROP FUNCTION IF EXISTS handle_presentation_session_insert();

-- Drop the unique constraint
ALTER TABLE presentation_settings DROP CONSTRAINT IF EXISTS presentation_settings_session_id_key;

-- Clean up any orphaned records
DELETE FROM presentation_settings 
WHERE session_id NOT IN (SELECT id FROM presentation_sessions);

-- Create new function with proper error handling
CREATE OR REPLACE FUNCTION handle_presentation_session_insert()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO presentation_settings (session_id)
    VALUES (NEW.id)
    ON CONFLICT DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create new trigger
CREATE TRIGGER tr_create_presentation_settings
    AFTER INSERT ON presentation_sessions
    FOR EACH ROW
    EXECUTE FUNCTION handle_presentation_session_insert();

-- Add the unique constraint back after cleanup
ALTER TABLE presentation_settings ADD CONSTRAINT presentation_settings_session_id_key UNIQUE (session_id);