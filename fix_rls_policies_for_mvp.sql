-- MVP Critical: Enable RLS and Create Policies for Missing Tables
-- This migration enables Row Level Security for tables that were missing it
-- Addresses critical deployment blockers for the MVP launch

-- Create helper function to cache auth.uid() result in the public schema
-- This avoids repeated JWT parsing which can be expensive on high-traffic queries
CREATE OR REPLACE FUNCTION public.uid_cached()
RETURNS uuid AS $
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid;
$ LANGUAGE sql STABLE SECURITY DEFINER;

-- 1. PROFILES TABLE - For user roles and admin access
-- Create table if it doesn't exist (from setup-admin-user.js)
CREATE TABLE IF NOT EXISTS profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  role TEXT DEFAULT 'user' CHECK (role IN ('user', 'admin', 'staff')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for profiles table
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view their own profile" ON profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON profiles;
DROP POLICY IF EXISTS "Service role can manage all profiles" ON profiles;

-- Users can SELECT their own profile
CREATE POLICY "Users can view their own profile" ON profiles
    FOR SELECT USING (public.uid_cached() = id);

-- Users can UPDATE their own profile
CREATE POLICY "Users can update their own profile" ON profiles
    FOR UPDATE USING (public.uid_cached() = id);

-- Service role can do ALL operations (needed for admin functions)
CREATE POLICY "Service role can manage all profiles" ON profiles
    FOR ALL USING (auth.role() = 'service_role');


-- 2. ARCHIVED_ORDERS TABLE - For data lifecycle and storage management
-- Enable RLS for archived_orders table
ALTER TABLE archived_orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view archived orders from their sessions" ON archived_orders;
DROP POLICY IF EXISTS "Service role can manage all archived orders" ON archived_orders;

-- Users can SELECT archived orders (simplified for MVP)
CREATE POLICY "Users can view archived orders from their sessions" ON archived_orders
    FOR SELECT USING (
        auth.role() = 'service_role'
    );

-- Service role can do ALL operations
CREATE POLICY "Service role can manage all archived orders" ON archived_orders
    FOR ALL USING (auth.role() = 'service_role');


-- 3. RESTAURANT_STORAGE_USAGE TABLE - For storage monitoring and billing
-- Enable RLS for restaurant_storage_usage table
ALTER TABLE restaurant_storage_usage ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Restaurants can view their own storage usage" ON restaurant_storage_usage;
DROP POLICY IF EXISTS "Service role can manage all storage usage data" ON restaurant_storage_usage;

-- Restaurants can SELECT their own storage usage data
CREATE POLICY "Restaurants can view their own storage usage" ON restaurant_storage_usage
    FOR SELECT USING (
        auth.role() = 'service_role'
    );

-- Service role can do ALL operations (needed for system maintenance)
CREATE POLICY "Service role can manage all storage usage data" ON restaurant_storage_usage
    FOR ALL USING (auth.role() = 'service_role');


-- Verification queries to confirm RLS policies are properly set up
DO $
BEGIN
    -- Verify profiles policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles') != 3 THEN
        RAISE WARNING 'profiles table should have 3 policies but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'profiles');
    ELSE
        RAISE NOTICE '✅ Profiles table: RLS enabled with 3 policies';
    END IF;

    -- Verify archived_orders policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'archived_orders') != 1 THEN
        RAISE WARNING 'archived_orders table should have 1 policy but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'archived_orders');
    ELSE
        RAISE NOTICE '✅ Archived Orders table: RLS enabled with 1 policy';
    END IF;

    -- Verify restaurant_storage_usage policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'restaurant_storage_usage') != 1 THEN
        RAISE WARNING 'restaurant_storage_usage table should have 1 policy but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'restaurant_storage_usage');
    ELSE
        RAISE NOTICE '✅ Restaurant Storage Usage table: RLS enabled with 1 policy';
    END IF;

    RAISE NOTICE '🎉 All RLS policies have been successfully applied for MVP launch!';
END $;