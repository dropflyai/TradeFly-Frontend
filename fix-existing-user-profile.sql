-- Fix profile for existing user
-- This will create the missing profile for the user that just signed up

-- First, let's see which users are missing profiles
SELECT
    u.id,
    u.email,
    u.created_at,
    CASE WHEN p.id IS NULL THEN '❌ Missing Profile' ELSE '✅ Has Profile' END as profile_status
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC;

-- Create profiles for users that don't have them
INSERT INTO public.user_profiles (id, email, full_name, onboarding_completed)
SELECT
    u.id,
    u.email,
    COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1)) as full_name,
    false as onboarding_completed
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
WHERE p.id IS NULL
ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = COALESCE(user_profiles.full_name, EXCLUDED.full_name);

-- Verify all users now have profiles
SELECT
    u.id,
    u.email,
    p.full_name,
    p.onboarding_completed,
    u.created_at
FROM auth.users u
LEFT JOIN public.user_profiles p ON u.id = p.id
ORDER BY u.created_at DESC;
