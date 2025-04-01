-- Create table for storing imported Google Classrooms
create table public.imported_classrooms (
  id serial primary key,
  classroom_id text not null,
  classroom_name text not null,
  teacher_id uuid references auth.users(id) not null,
  student_count integer not null default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now(),
  last_used_at timestamp with time zone,
  -- Prevent duplicate classrooms for a teacher
  unique (classroom_id, teacher_id)
);

-- Enable RLS
alter table public.imported_classrooms enable row level security;

-- Create policy to allow teachers to select their own imported classrooms
create policy "Teachers can view their imported classrooms" 
on public.imported_classrooms for select 
using (auth.uid() = teacher_id);

-- Create policy to allow teachers to insert their own imported classrooms
create policy "Teachers can import classrooms" 
on public.imported_classrooms for insert 
with check (auth.uid() = teacher_id);

-- Create policy to allow teachers to update their own imported classrooms
create policy "Teachers can update their imported classrooms" 
on public.imported_classrooms for update 
using (auth.uid() = teacher_id);

-- Create function to update the last_used_at timestamp
create or replace function update_imported_classroom_last_used()
returns trigger as $$
begin
  update public.imported_classrooms
  set last_used_at = now()
  where classroom_id = new.classroom_id and teacher_id = new.teacher_id;
  return new;
end;
$$ language plpgsql security definer;