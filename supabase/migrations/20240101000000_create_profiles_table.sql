-- Creates a table for user profiles
create table public.profiles (
  id uuid references auth.users on delete cascade not null primary key,
  full_name text,
  avatar_url text,
  email text,
  role text check (role in ('teacher', 'student')),
  class text,
  updated_at timestamp with time zone default now(),
  created_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table public.profiles enable row level security;

-- Create a policy that allows users to read any profile
create policy "Anyone can read profiles" on public.profiles
  for select using (true);

-- Create a policy that allows users to update their own profile
create policy "Users can update their own profile" on public.profiles
  for update using (auth.uid() = id);

-- Create a function to handle new user creation
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, avatar_url, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'student')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Create a trigger to add a profile when a user is created
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- Create a secure function to update the current user's profile
create or replace function update_profile(
  full_name text default null,
  avatar_url text default null,
  class text default null
)
returns boolean as $$
begin
  update public.profiles
  set
    full_name = coalesce(update_profile.full_name, full_name),
    avatar_url = coalesce(update_profile.avatar_url, avatar_url),
    class = coalesce(update_profile.class, class),
    updated_at = now()
  where id = auth.uid();
  return true;
end;
$$ language plpgsql security definer;