-- First, delete duplicate entries keeping only the most recent one for each session_id, user_id pair
DELETE FROM session_participants a
WHERE a.id IN (
    SELECT id
    FROM (
        SELECT id,
               ROW_NUMBER() OVER (
                   PARTITION BY session_id, user_id
                   ORDER BY last_active_at DESC, id DESC
               ) as row_num
        FROM session_participants
    ) t
    WHERE t.row_num > 1
);

-- Now add the unique constraint
ALTER TABLE session_participants
ADD CONSTRAINT session_participants_session_user_unique 
UNIQUE (session_id, user_id);

-- Add index to improve lookup performance
CREATE INDEX IF NOT EXISTS idx_session_participants_session_user 
ON session_participants(session_id, user_id);