-- Add settings column to presentations table
ALTER TABLE presentations ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}'::jsonb;

-- Update any existing rows to have default settings
UPDATE presentations SET settings = '{"showCalculator": true}'::jsonb WHERE settings IS NULL;