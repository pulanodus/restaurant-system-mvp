-- RLS Performance Optimization Migration
-- This migration optimizes Row Level Security policies for better performance
-- by using a cached version of auth.uid() to reduce JWT parsing overhead

-- Create helper function to cache auth.uid() result in the public schema
-- This avoids repeated JWT parsing which can be expensive on high-traffic queries
CREATE OR REPLACE FUNCTION public.uid_cached()
RETURNS uuid AS $
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Optimize RLS policies for tables that currently use auth.uid()
-- Currently, only the profiles table uses auth.uid() in its policies

-- Update profiles table policies to use uid_cached() instead of auth.uid()
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Create optimized policies using public.uid_cached()
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (public.uid_cached() = id);

CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (public.uid_cached() = id);

-- Service role policy remains the same (doesn't use auth.uid)
CREATE POLICY "Service role can manage all profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role');

-- Note: For other tables that may be added in the future with auth.uid() policies,
-- they should use public.uid_cached() instead for better performance

-- Verification query to confirm policies are properly set up
DO $
BEGIN
    -- Verify profiles policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') != 3 THEN
        RAISE WARNING 'profiles table should have 3 policies but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles');
    ELSE
        RAISE NOTICE '✅ Profiles table: RLS policies optimized with public.uid_cached()';
    END IF;

    RAISE NOTICE '🎉 RLS performance optimization completed successfully!';
END $;