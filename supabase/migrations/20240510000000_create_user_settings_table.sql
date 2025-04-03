-- Create a table for user settings
create table public.user_settings (
    id uuid references auth.users on delete cascade not null primary key,
    openrouter_api_key text,
    settings jsonb default '{}'::jsonb,
    created_at timestamp with time zone default now(),
    updated_at timestamp with time zone default now()
);

-- Enable row level security
alter table public.user_settings enable row level security;

-- Create policy that allows users to view their own settings
create policy "Users can view their own settings"
on public.user_settings for select
using (auth.uid() = id);

-- Create policy that allows users to update their own settings
create policy "Users can update their own settings"
on public.user_settings for update
using (auth.uid() = id);

-- Create policy that allows users to insert their own settings
create policy "Users can insert their own settings"
on public.user_settings for insert
with check (auth.uid() = id);

-- Create policy that allows service role to access all settings
create policy "Service role full access"
on public.user_settings
using (auth.role() = 'service_role');

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