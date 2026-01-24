-- Force update user role to teacher (again)
UPDATE public.profiles 
SET role = 'teacher' 
WHERE id = '7eb9fb44-0529-4eda-9365-ca703755da3a';

-- Verify it worked
DO $$
DECLARE
    r text;
BEGIN
    SELECT role INTO r FROM public.profiles WHERE id = '7eb9fb44-0529-4eda-9365-ca703755da3a';
    IF r != 'teacher' THEN
        RAISE EXCEPTION 'Role update failed. Current role: %', r;
    END IF;
END $$;
