-- Consolidated schema for teachnology-sync
-- This replaces all fragmented migrations with a clean setup

-- ============================================
-- CORE TABLES
-- ============================================

-- Profiles table (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid REFERENCES auth.users ON DELETE CASCADE NOT NULL PRIMARY KEY,
  full_name text,
  avatar_url text,
  email text,
  role text CHECK (role IN ('teacher', 'student')),
  class text,
  updated_at timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Presentations table
CREATE TABLE IF NOT EXISTS public.presentations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  teacher_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slides jsonb DEFAULT '[]'::jsonb,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Presentation sessions table
CREATE TABLE IF NOT EXISTS public.presentation_sessions (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  join_code text NOT NULL UNIQUE,
  presentation_id uuid REFERENCES public.presentations(id) ON DELETE CASCADE NOT NULL,
  current_slide integer DEFAULT 0,
  started_at timestamp with time zone DEFAULT now(),
  ended_at timestamp with time zone,
  is_synced boolean DEFAULT true,
  is_paused boolean DEFAULT false,
  classroom_id text,
  classroom_name text,
  paced_slides integer[] DEFAULT '{}'::integer[]
);

-- Session participants table
CREATE TABLE IF NOT EXISTS public.session_participants (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.presentation_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  joined_at timestamp with time zone DEFAULT now(),
  is_active boolean DEFAULT true,
  UNIQUE(session_id, user_id)
);

-- Student responses table
CREATE TABLE IF NOT EXISTS public.student_responses (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.presentation_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  slide_index integer NOT NULL,
  response jsonb NOT NULL,
  created_at timestamp with time zone DEFAULT now()
);

-- Imported classrooms table (Google Classroom integration)
CREATE TABLE IF NOT EXISTS public.imported_classrooms (
  id serial PRIMARY KEY,
  classroom_id text NOT NULL,
  classroom_name text NOT NULL,
  teacher_id uuid REFERENCES auth.users(id) NOT NULL,
  student_count integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  last_used_at timestamp with time zone,
  UNIQUE (classroom_id, teacher_id)
);

-- User settings table
CREATE TABLE IF NOT EXISTS public.user_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
  openrouter_api_key text,
  elevenlabs_api_key text,
  tts_voice text,
  tts_enabled boolean DEFAULT false,
  model_name text,
  api_endpoint text,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Presentation settings table
CREATE TABLE IF NOT EXISTS public.presentation_settings (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id uuid REFERENCES public.presentation_sessions(id) ON DELETE CASCADE NOT NULL UNIQUE,
  openrouter_api_key text,
  elevenlabs_api_key text,
  tts_voice text,
  tts_enabled boolean DEFAULT false,
  celebration_enabled boolean DEFAULT true,
  celebration_type text DEFAULT 'confetti',
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.imported_classrooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.presentation_settings ENABLE ROW LEVEL SECURITY;

-- ============================================
-- DROP EXISTING POLICIES (to avoid conflicts)
-- ============================================

DROP POLICY IF EXISTS "Anyone can read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
DROP POLICY IF EXISTS "Anyone can read presentations" ON public.presentations;
DROP POLICY IF EXISTS "Teachers can manage their presentations" ON public.presentations;
DROP POLICY IF EXISTS "Anyone can read sessions" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Teachers can manage sessions for their presentations" ON public.presentation_sessions;
DROP POLICY IF EXISTS "Anyone can read participants" ON public.session_participants;
DROP POLICY IF EXISTS "Users can join sessions" ON public.session_participants;
DROP POLICY IF EXISTS "Users can update their participation" ON public.session_participants;
DROP POLICY IF EXISTS "Teachers can read responses for their sessions" ON public.student_responses;
DROP POLICY IF EXISTS "Students can manage their responses" ON public.student_responses;
DROP POLICY IF EXISTS "Teachers can view their imported classrooms" ON public.imported_classrooms;
DROP POLICY IF EXISTS "Teachers can import classrooms" ON public.imported_classrooms;
DROP POLICY IF EXISTS "Teachers can update their imported classrooms" ON public.imported_classrooms;
DROP POLICY IF EXISTS "Users can manage their own settings" ON public.user_settings;
DROP POLICY IF EXISTS "Teachers can manage presentation settings" ON public.presentation_settings;
DROP POLICY IF EXISTS "Anyone can read presentation settings" ON public.presentation_settings;

-- ============================================
-- POLICIES
-- ============================================

-- Profiles policies
CREATE POLICY "Anyone can read profiles" ON public.profiles
  FOR SELECT USING (true);

CREATE POLICY "Users can update their own profile" ON public.profiles
  FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Users can insert their own profile" ON public.profiles
  FOR INSERT WITH CHECK (auth.uid() = id);

-- Presentations policies
CREATE POLICY "Anyone can read presentations" ON public.presentations
  FOR SELECT USING (true);

CREATE POLICY "Teachers can manage their presentations" ON public.presentations
  FOR ALL USING (auth.uid() = teacher_id);

-- Sessions policies
CREATE POLICY "Anyone can read sessions" ON public.presentation_sessions
  FOR SELECT USING (true);

CREATE POLICY "Teachers can manage sessions for their presentations" ON public.presentation_sessions
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.presentations p 
      WHERE p.id = presentation_sessions.presentation_id 
      AND p.teacher_id = auth.uid()
    )
  );

-- Participants policies
CREATE POLICY "Anyone can read participants" ON public.session_participants
  FOR SELECT USING (true);

CREATE POLICY "Users can join sessions" ON public.session_participants
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their participation" ON public.session_participants
  FOR UPDATE USING (auth.uid() = user_id);

-- Student responses policies
CREATE POLICY "Teachers can read responses for their sessions" ON public.student_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.presentation_sessions ps
      JOIN public.presentations p ON p.id = ps.presentation_id
      WHERE ps.id = student_responses.session_id
      AND p.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Students can manage their responses" ON public.student_responses
  FOR ALL USING (auth.uid() = user_id);

-- Imported classrooms policies
CREATE POLICY "Teachers can view their imported classrooms" ON public.imported_classrooms
  FOR SELECT USING (auth.uid() = teacher_id);

CREATE POLICY "Teachers can import classrooms" ON public.imported_classrooms
  FOR INSERT WITH CHECK (auth.uid() = teacher_id);

CREATE POLICY "Teachers can update their imported classrooms" ON public.imported_classrooms
  FOR UPDATE USING (auth.uid() = teacher_id);

-- User settings policies
CREATE POLICY "Users can manage their own settings" ON public.user_settings
  FOR ALL USING (auth.uid() = user_id);

-- Presentation settings policies
CREATE POLICY "Teachers can manage presentation settings" ON public.presentation_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.presentation_sessions ps
      JOIN public.presentations p ON p.id = ps.presentation_id
      WHERE ps.id = presentation_settings.session_id
      AND p.teacher_id = auth.uid()
    )
  );

CREATE POLICY "Anyone can read presentation settings" ON public.presentation_settings
  FOR SELECT USING (true);

-- ============================================
-- FUNCTIONS & TRIGGERS
-- ============================================

-- Handle new user creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'name', new.raw_user_meta_data->>'full_name'),
    new.raw_user_meta_data->>'avatar_url',
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'student')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger for new user
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Auto-create user settings
CREATE OR REPLACE FUNCTION public.handle_new_user_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.user_settings (user_id)
  VALUES (new.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_profile_created_settings ON public.profiles;
CREATE TRIGGER on_profile_created_settings
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_settings();

-- Auto-create presentation settings when session is created
CREATE OR REPLACE FUNCTION public.handle_new_session_settings()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.presentation_settings (session_id)
  VALUES (new.id)
  ON CONFLICT (session_id) DO NOTHING;
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_session_created_settings ON public.presentation_sessions;
CREATE TRIGGER on_session_created_settings
  AFTER INSERT ON public.presentation_sessions
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_session_settings();

-- ============================================
-- GRANTS
-- ============================================

GRANT ALL ON public.profiles TO authenticated;
GRANT ALL ON public.presentations TO authenticated;
GRANT ALL ON public.presentation_sessions TO authenticated;
GRANT ALL ON public.session_participants TO authenticated;
GRANT ALL ON public.student_responses TO authenticated;
GRANT ALL ON public.imported_classrooms TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.presentation_settings TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
