-- TradeFly Complete Database Setup
-- Run this in Supabase SQL Editor to fix "Database error saving new user"
-- This creates all necessary tables and triggers for user signup

-- ============================================================================
-- 1. CREATE USER PROFILES TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
    account_balance DECIMAL(12, 2) DEFAULT 10000.00,
    paper_trading_enabled BOOLEAN DEFAULT true,

    -- Onboarding fields
    onboarding_completed BOOLEAN DEFAULT false,
    risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    trading_capital DECIMAL(12, 2) DEFAULT 10000.00,
    daily_goal DECIMAL(12, 2) DEFAULT 200.00,
    default_position_size DECIMAL(10, 2) DEFAULT 1000.00,
    notification_email BOOLEAN DEFAULT true,
    notification_browser BOOLEAN DEFAULT true,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create RLS policies
CREATE POLICY "Users can view own profile"
    ON public.user_profiles FOR SELECT
    USING (auth.uid() = id);

CREATE POLICY "Users can update own profile"
    ON public.user_profiles FOR UPDATE
    USING (auth.uid() = id);

CREATE POLICY "Users can insert own profile"
    ON public.user_profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- ============================================================================
-- 2. CREATE ACTIVITY LOG TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.activity_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policy if exists
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_log;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create RLS policies
CREATE POLICY "Users can view own activity"
    ON public.activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
    ON public.activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at);

-- ============================================================================
-- 3. CREATE TRIGGER FUNCTION TO AUTO-CREATE USER PROFILE
-- ============================================================================

-- Drop existing trigger and function
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user();

-- Create function with proper error handling
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
SECURITY DEFINER
SET search_path = public, auth
LANGUAGE plpgsql
AS $$
BEGIN
    -- Insert user profile
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1))
    )
    ON CONFLICT (id) DO NOTHING;

    RETURN NEW;
EXCEPTION
    WHEN OTHERS THEN
        -- Log error but don't fail the signup
        RAISE WARNING 'Error creating user profile: %', SQLERRM;
        RETURN NEW;
END;
$$;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- 4. CREATE UPDATE TIMESTAMP FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- Drop existing triggers
DROP TRIGGER IF EXISTS update_user_profiles_updated_at ON public.user_profiles;

-- Create trigger
CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- 5. GRANT PERMISSIONS
-- ============================================================================

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;

-- ============================================================================
-- VERIFICATION
-- ============================================================================

-- Check that tables exist
SELECT
    tablename,
    CASE WHEN rowsecurity THEN '✓ RLS Enabled' ELSE '✗ RLS Disabled' END as security_status
FROM pg_tables
WHERE schemaname = 'public'
    AND tablename IN ('user_profiles', 'activity_log')
ORDER BY tablename;

-- Check that trigger exists
SELECT
    trigger_name,
    event_manipulation,
    event_object_table,
    action_statement
FROM information_schema.triggers
WHERE trigger_name = 'on_auth_user_created';
