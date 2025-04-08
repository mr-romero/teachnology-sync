alter table user_settings
add column if not exists tts_settings jsonb default jsonb_build_object(
  'enabled', false,
  'voice_id', 'pNInz6obpgDQGcFmaJgB',
  'auto_play', false
);