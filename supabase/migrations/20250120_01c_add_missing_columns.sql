-- Add missing columns to existing tables
-- This migration adds columns that are referenced but don't exist yet

-- Add diner_name column to orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS diner_name TEXT;

-- Create index for diner_name in orders
CREATE INDEX IF NOT EXISTS idx_orders_diner_name ON orders(diner_name);

-- Add any other missing columns that might be needed
-- Check if status column exists in orders, if not add it
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- Create index for status in orders
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Add created_at and updated_at to orders if they don't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create updated_at trigger for orders
CREATE OR REPLACE FUNCTION update_orders_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_orders_updated_at ON orders;
CREATE TRIGGER trigger_update_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_orders_updated_at();

-- Add missing columns to sessions table if needed
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS ended_at TIMESTAMPTZ;

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS created_by UUID;

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create updated_at trigger for sessions
CREATE OR REPLACE FUNCTION update_sessions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_sessions_updated_at ON sessions;
CREATE TRIGGER trigger_update_sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION update_sessions_updated_at();

-- Add missing columns to menu_items table if needed
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS description TEXT;

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS category TEXT;

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT TRUE;

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create updated_at trigger for menu_items
CREATE OR REPLACE FUNCTION update_menu_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_menu_items_updated_at ON menu_items;
CREATE TRIGGER trigger_update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_menu_items_updated_at();

-- Add missing columns to tables table if needed
ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS capacity INTEGER;

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS occupied BOOLEAN DEFAULT FALSE;

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS current_session_id UUID;

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS current_pin TEXT;

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS owner_id UUID;

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Create updated_at trigger for tables
CREATE OR REPLACE FUNCTION update_tables_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_tables_updated_at ON tables;
CREATE TRIGGER trigger_update_tables_updated_at
  BEFORE UPDATE ON tables
  FOR EACH ROW
  EXECUTE FUNCTION update_tables_updated_at();

-- Add comments for documentation
COMMENT ON COLUMN orders.diner_name IS 'Name of the diner who placed this order';
COMMENT ON COLUMN orders.status IS 'Order status: pending, confirmed, preparing, ready, served, cancelled';
COMMENT ON COLUMN sessions.started_at IS 'When the session was started';
COMMENT ON COLUMN sessions.ended_at IS 'When the session was ended';
COMMENT ON COLUMN menu_items.is_available IS 'Whether this menu item is currently available';
COMMENT ON COLUMN tables.occupied IS 'Whether this table is currently occupied';
COMMENT ON COLUMN tables.is_active IS 'Whether this table is active and can be used';
