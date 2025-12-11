-- Fix Security Issues and Ensure Proper Auth Setup (Safe Version)
-- Run this in Supabase SQL Editor

-- ============================================================================
-- FIX 1: Fix Security Definer Views (Safe)
-- ============================================================================

-- Drop and recreate views without SECURITY DEFINER
DROP VIEW IF EXISTS public.paper_trading_stats CASCADE;
DROP VIEW IF EXISTS public.active_signals CASCADE;
DROP VIEW IF EXISTS public.latest_market_movers CASCADE;

-- Only recreate paper_trading_stats if paper_trades table exists
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'paper_trades') THEN
        CREATE VIEW public.paper_trading_stats AS
        SELECT
            user_id,
            COUNT(*) as total_trades,
            SUM(CASE WHEN status = 'closed' AND exit_price > entry_price THEN 1 ELSE 0 END) as winning_trades,
            SUM(CASE WHEN status = 'closed' AND exit_price < entry_price THEN 1 ELSE 0 END) as losing_trades,
            SUM(CASE WHEN status = 'closed' THEN (exit_price - entry_price) * 100 ELSE 0 END) as total_profit_loss
        FROM paper_trades
        WHERE user_id = auth.uid()
        GROUP BY user_id;
    END IF;
END $$;

-- ============================================================================
-- FIX 2: Fix Function Search Paths
-- ============================================================================

-- Fix handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.user_profiles (id, email, full_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email)
    )
    ON CONFLICT (id) DO NOTHING;

    -- Create default settings
    INSERT INTO public.user_settings (user_id)
    VALUES (NEW.id)
    ON CONFLICT (user_id) DO NOTHING;

    RETURN NEW;
END;
$$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$;

-- ============================================================================
-- FIX 3: Ensure User Profiles Table Exists with Proper Structure
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'pro', 'premium')),
    account_balance DECIMAL(12, 2) DEFAULT 10000.00,
    paper_trading_enabled BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can update own profile" ON public.user_profiles;
    DROP POLICY IF EXISTS "Users can insert own profile" ON public.user_profiles;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policies
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
-- FIX 4: Ensure User Settings Table Exists
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
    notification_email BOOLEAN DEFAULT true,
    notification_browser BOOLEAN DEFAULT true,
    risk_tolerance TEXT DEFAULT 'moderate' CHECK (risk_tolerance IN ('conservative', 'moderate', 'aggressive')),
    default_position_size DECIMAL(10, 2) DEFAULT 1000.00,
    auto_close_enabled BOOLEAN DEFAULT false,
    theme TEXT DEFAULT 'dark' CHECK (theme IN ('light', 'dark')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can manage own settings" ON public.user_settings;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policy
CREATE POLICY "Users can manage own settings"
    ON public.user_settings FOR ALL
    USING (auth.uid() = user_id);

-- ============================================================================
-- FIX 5: Ensure Activity Log Table Exists
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

-- Enable RLS
ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

-- Drop existing policies safely
DO $$
BEGIN
    DROP POLICY IF EXISTS "Users can view own activity" ON public.activity_log;
    DROP POLICY IF EXISTS "Users can insert own activity" ON public.activity_log;
EXCEPTION
    WHEN undefined_object THEN NULL;
END $$;

-- Create policies
CREATE POLICY "Users can view own activity"
    ON public.activity_log FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own activity"
    ON public.activity_log FOR INSERT
    WITH CHECK (auth.uid() = user_id);

-- Create indexes safely
CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at);

-- ============================================================================
-- FIX 6: Recreate Trigger
-- ============================================================================

-- Drop and recreate trigger
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================================
-- FIX 7: Grant Necessary Permissions
-- ============================================================================

-- Grant access to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.user_profiles TO authenticated;
GRANT ALL ON public.user_settings TO authenticated;
GRANT ALL ON public.activity_log TO authenticated;

-- ============================================================================
-- SUCCESS MESSAGE
-- ============================================================================

DO $$
BEGIN
    RAISE NOTICE '✅ Authentication setup completed successfully!';
    RAISE NOTICE 'Tables created: user_profiles, user_settings, activity_log';
    RAISE NOTICE 'RLS policies enabled on all tables';
    RAISE NOTICE 'Trigger created for automatic user profile creation';
    RAISE NOTICE '';
    RAISE NOTICE 'You can now test signup at: https://tradeflyai.com/login.html';
END $$;
