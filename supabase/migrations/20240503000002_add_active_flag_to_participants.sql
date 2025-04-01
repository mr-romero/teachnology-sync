-- Add is_active column to session_participants table with default false
ALTER TABLE session_participants
ADD COLUMN is_active boolean DEFAULT false;

-- Update existing records to be active by default (since they already joined)
UPDATE session_participants
SET is_active = true
WHERE joined_at IS NOT NULL;

-- Add index to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_session_participants_active
ON session_participants(session_id, is_active);