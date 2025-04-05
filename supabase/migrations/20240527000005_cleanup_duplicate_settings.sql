-- Delete duplicate presentation_settings records, keeping the earliest one
DELETE FROM presentation_settings a USING (
    SELECT session_id, MIN(id) as min_id
    FROM presentation_settings
    GROUP BY session_id
    HAVING COUNT(*) > 1
) b
WHERE a.session_id = b.session_id
AND a.id != b.min_id;