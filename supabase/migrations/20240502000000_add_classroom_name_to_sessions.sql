// filepath: /Users/abe/Documents/VSCode/teachnology-sync/supabase/migrations/20240502000000_add_classroom_name_to_sessions.sql
-- Add classroom_name column to presentation_sessions table
ALTER TABLE presentation_sessions 
ADD COLUMN IF NOT EXISTS classroom_name TEXT;