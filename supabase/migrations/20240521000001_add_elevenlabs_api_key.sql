-- Add elevenlabs_api_key to the settings JSONB field
CREATE OR REPLACE FUNCTION add_elevenlabs_api_key()
RETURNS void AS $$
BEGIN
  UPDATE user_settings
  SET settings = COALESCE(settings, '{}'::jsonb) || 
    jsonb_build_object('elevenlabs_api_key', null)
  WHERE NOT (settings ? 'elevenlabs_api_key');
END;
$$ LANGUAGE plpgsql;

SELECT add_elevenlabs_api_key();