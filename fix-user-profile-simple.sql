-- Simple fix to create missing user profiles
-- This works with the existing table structure

-- First, check what columns exist in user_profiles
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'user_profiles'
ORDER BY ordinal_position;

-- Create profiles for users that don't have them (simple version)
INSERT INTO public.user_profiles (id, full_name, onboarding_completed)
SELECT
    u.id,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
    false as onboarding_completed
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO NOTHING;

-- Verify the profile was created
SELECT
    u.id,
    u.email,
    p.full_name,
    p.onboarding_completed,
    p.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC
LIMIT 10;
