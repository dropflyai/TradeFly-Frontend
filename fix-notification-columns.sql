-- Add notification columns to user_profiles to fix onboarding crash
-- Run this in Supabase SQL Editor

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true;

ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS notification_browser BOOLEAN DEFAULT true;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Notification columns added to user_profiles!';
    RAISE NOTICE 'Onboarding should now complete successfully';
END $$;
