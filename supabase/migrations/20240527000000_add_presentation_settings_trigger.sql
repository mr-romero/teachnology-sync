-- Create trigger that safely creates presentation_settings only if they don't exist
CREATE OR REPLACE FUNCTION create_presentation_settings()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO presentation_settings (session_id)
  VALUES (NEW.id)
  ON CONFLICT (session_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_presentation_settings_trigger
AFTER INSERT ON presentation_sessions
FOR EACH ROW EXECUTE FUNCTION create_presentation_settings();
