-- Add Trading Capital and Daily Goal fields to user_profiles
-- Run this in Supabase SQL Editor

-- Add trading_capital column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS trading_capital DECIMAL(12, 2) DEFAULT 10000.00;

-- Add daily_goal column
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS daily_goal DECIMAL(12, 2) DEFAULT 200.00;

-- Add onboarding_completed column (if not exists)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT false;

-- Add risk_tolerance column to user_profiles (if not exists)
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'public'
        AND table_name = 'user_profiles'
        AND column_name = 'risk_tolerance'
    ) THEN
        ALTER TABLE public.user_profiles
        ADD COLUMN risk_tolerance TEXT DEFAULT 'moderate'
        CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive'));
    END IF;
END $$;

-- Add default_position_size column to user_profiles (if not exists)
ALTER TABLE public.user_profiles
ADD COLUMN IF NOT EXISTS default_position_size DECIMAL(12, 2) DEFAULT 1000.00;

-- Ensure user_settings has notification columns
ALTER TABLE public.user_settings
ADD COLUMN IF NOT EXISTS notification_email BOOLEAN DEFAULT true,
ADD COLUMN IF NOT EXISTS notification_browser BOOLEAN DEFAULT true;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Onboarding fields added successfully!';
    RAISE NOTICE 'Added columns: trading_capital, daily_goal, onboarding_completed, risk_tolerance, default_position_size';
    RAISE NOTICE 'Users can now complete onboarding and have personalized signal recommendations';
END $$;
