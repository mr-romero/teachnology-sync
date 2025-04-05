-- Create index on session_id if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'presentation_settings'
        AND indexname = 'presentation_settings_session_id_idx'
    ) THEN
        CREATE INDEX presentation_settings_session_id_idx ON presentation_settings(session_id);
    END IF;
END $$;