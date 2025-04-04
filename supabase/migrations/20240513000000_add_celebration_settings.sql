-- Add celebration settings to user_settings table
ALTER TABLE user_settings
ADD COLUMN IF NOT EXISTS celebration_settings jsonb DEFAULT jsonb_build_object(
  'type', 'default',
  'effects', jsonb_build_object(
    'confetti', true,
    'sound', true,
    'screenEffect', 'gold'
  )
);