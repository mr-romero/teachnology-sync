-- Add validation for celebration_settings
ALTER TABLE user_settings
DROP CONSTRAINT IF EXISTS celebration_settings_check;

ALTER TABLE user_settings
ADD CONSTRAINT celebration_settings_check CHECK (
  celebration_settings IS NULL OR (
    celebration_settings ? 'type' AND
    celebration_settings->>'type' IN ('custom', 'preset', 'default') AND
    (
      (celebration_settings->>'type' = 'custom' AND celebration_settings ? 'phrase') OR
      (celebration_settings->>'type' = 'preset' AND celebration_settings ? 'preset') OR
      celebration_settings->>'type' = 'default'
    ) AND
    (
      celebration_settings->'effects' IS NULL OR (
        celebration_settings->'effects' ? 'confetti' AND
        celebration_settings->'effects' ? 'sound' AND
        celebration_settings->'effects' ? 'screenEffect' AND
        celebration_settings->'effects'->>'screenEffect' IN ('none', 'gold', 'stars', 'rainbow')
      )
    )
  )
);