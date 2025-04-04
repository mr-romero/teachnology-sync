-- Drop the existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created_settings ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user_settings();

-- Create the corrected function to handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Recreate the trigger with the fixed function
CREATE TRIGGER on_auth_user_created_settings
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user_settings();

-- Backfill any missing user settings
INSERT INTO user_settings (user_id)
SELECT id FROM auth.users
WHERE NOT EXISTS (
    SELECT 1 FROM user_settings WHERE user_settings.user_id = auth.users.id
);