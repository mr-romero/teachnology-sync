-- Create user_settings table
CREATE TABLE IF NOT EXISTS user_settings (
    id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at timestamptz DEFAULT NOW(),
    updated_at timestamptz DEFAULT NOW(),
    openrouter_api_key text,
    celebration_settings jsonb DEFAULT jsonb_build_object(
        'type', 'default',
        'effects', jsonb_build_object(
            'confetti', true,
            'sound', true,
            'screenEffect', 'gold'
        )
    ),
    CONSTRAINT user_settings_user_id_key UNIQUE (user_id)
);

-- Add RLS policies
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;

-- Allow users to read their own settings
CREATE POLICY "Users can read their own settings"
    ON user_settings
    FOR SELECT
    USING (auth.uid() = user_id);

-- Allow users to update their own settings
CREATE POLICY "Users can update their own settings"
    ON user_settings
    FOR UPDATE
    USING (auth.uid() = user_id);

-- Allow users to insert their own settings
CREATE POLICY "Users can insert their own settings"
    ON user_settings
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_settings_user_id ON user_settings(user_id);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for updated_at
CREATE TRIGGER set_timestamp
    BEFORE UPDATE ON user_settings
    FOR EACH ROW
    EXECUTE FUNCTION handle_updated_at();

-- Create a function to handle new user creation
create or replace function public.handle_new_user_settings()
returns trigger as $$
begin
    insert into public.user_settings (id)
    values (new.id);
    return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to add settings when a user is created
create trigger on_auth_user_created_settings
    after insert on auth.users
    for each row execute procedure public.handle_new_user_settings();

-- Create a function to get OpenRouter API key
create or replace function get_openrouter_api_key(user_id uuid)
returns text as $$
begin
    return (
        select openrouter_api_key
        from public.user_settings
        where id = user_id
    );
end;
$$ language plpgsql security definer;