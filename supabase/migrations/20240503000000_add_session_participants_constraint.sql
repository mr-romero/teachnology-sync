-- Add unique constraint to session_participants table
ALTER TABLE session_participants
ADD CONSTRAINT session_participants_session_user_unique 
UNIQUE (session_id, user_id);

-- Add index to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_session_participants_session_user 
ON session_participants(session_id, user_id);