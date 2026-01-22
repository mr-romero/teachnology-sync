-- Fix existing user's role to teacher
UPDATE public.profiles 
SET role = 'teacher' 
WHERE id = '7eb9fb44-0529-4eda-9365-ca703755da3a';
