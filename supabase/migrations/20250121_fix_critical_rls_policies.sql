-- Fix Critical RLS Policies for Tables, Orders, Sessions, and Menu Items
-- This migration adds RLS policies to critical tables that were missing them

-- RLS policies for TABLES table
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can view tables" ON tables;
DROP POLICY IF EXISTS "Service role can manage tables" ON tables;

-- Public can SELECT (view tables)
CREATE POLICY "Public can view tables" ON tables
    FOR SELECT USING (true);

-- Service role can do ALL operations
CREATE POLICY "Service role can manage tables" ON tables
    FOR ALL USING (auth.role() = 'service_role');


-- RLS policies for ORDERS table
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Users can view orders in active sessions" ON orders;
DROP POLICY IF EXISTS "Anyone can insert orders" ON orders;
DROP POLICY IF EXISTS "Users can update pending orders in active sessions" ON orders;
DROP POLICY IF EXISTS "Service role can manage all orders" ON orders;

-- Users can SELECT orders in active sessions
CREATE POLICY "Users can view orders in active sessions" ON orders
    FOR SELECT USING (
        EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = orders.session_id 
            AND sessions.status = 'active'
        )
    );

-- Anyone can INSERT orders (customers placing orders)
CREATE POLICY "Anyone can insert orders" ON orders
    FOR INSERT WITH CHECK (true);

-- Users can UPDATE pending orders in active sessions
CREATE POLICY "Users can update pending orders in active sessions" ON orders
    FOR UPDATE USING (
        status IN ('pending', 'cart') 
        AND EXISTS (
            SELECT 1 FROM sessions 
            WHERE sessions.id = orders.session_id 
            AND sessions.status = 'active'
        )
    );

-- Service role can do ALL operations
CREATE POLICY "Service role can manage all orders" ON orders
    FOR ALL USING (auth.role() = 'service_role');


-- RLS policies for SESSIONS table
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can view active sessions" ON sessions;
DROP POLICY IF EXISTS "Anyone can create sessions" ON sessions;
DROP POLICY IF EXISTS "Users can update active sessions" ON sessions;
DROP POLICY IF EXISTS "Service role can manage all sessions" ON sessions;

-- Public can SELECT active sessions
CREATE POLICY "Public can view active sessions" ON sessions
    FOR SELECT USING (status = 'active');

-- Anyone can INSERT sessions (starting new table)
CREATE POLICY "Anyone can create sessions" ON sessions
    FOR INSERT WITH CHECK (true);

-- Users can UPDATE active sessions
CREATE POLICY "Users can update active sessions" ON sessions
    FOR UPDATE USING (status = 'active');

-- Service role can do ALL operations
CREATE POLICY "Service role can manage all sessions" ON sessions
    FOR ALL USING (auth.role() = 'service_role');


-- RLS policies for MENU_ITEMS table
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist to avoid conflicts
DROP POLICY IF EXISTS "Public can view available menu items" ON menu_items;
DROP POLICY IF EXISTS "Service role can manage all menu items" ON menu_items;

-- Public can SELECT available menu items (is_available = true)
CREATE POLICY "Public can view available menu items" ON menu_items
    FOR SELECT USING (is_available = true OR is_available IS NULL);

-- Service role can do ALL operations
CREATE POLICY "Service role can manage all menu items" ON menu_items
    FOR ALL USING (auth.role() = 'service_role');


-- Verification queries to check that policies were created
DO $$
BEGIN
    -- Verify tables policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'tables') != 2 THEN
        RAISE WARNING 'tables table should have 2 policies but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'tables');
    END IF;

    -- Verify orders policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders') != 4 THEN
        RAISE WARNING 'orders table should have 4 policies but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'orders');
    END IF;

    -- Verify sessions policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sessions') != 4 THEN
        RAISE WARNING 'sessions table should have 4 policies but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'sessions');
    END IF;

    -- Verify menu_items policies
    IF (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'menu_items') != 2 THEN
        RAISE WARNING 'menu_items table should have 2 policies but has %', (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'menu_items');
    END IF;

    RAISE NOTICE 'RLS policies created successfully for tables: tables, orders, sessions, menu_items';
END $$;