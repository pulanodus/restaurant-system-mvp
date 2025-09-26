-- Simple multi-tenant architecture migration
-- This migration adds restaurant_id to all tables for proper data isolation

-- Add restaurant_id to sessions table
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Add restaurant_id to orders table  
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Add restaurant_id to cart_items table
ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Add restaurant_id to split_bills table
ALTER TABLE split_bills 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Add restaurant_id to diners table
ALTER TABLE diners 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Add restaurant_id to notifications table
ALTER TABLE notifications 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Create indexes for better performance on restaurant_id queries
CREATE INDEX IF NOT EXISTS idx_sessions_restaurant_id ON sessions(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_id ON orders(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_restaurant_id ON cart_items(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_split_bills_restaurant_id ON split_bills(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_diners_restaurant_id ON diners(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_notifications_restaurant_id ON notifications(restaurant_id);

-- Create composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_sessions_restaurant_status ON sessions(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_status ON orders(restaurant_id, status);
CREATE INDEX IF NOT EXISTS idx_orders_restaurant_session ON orders(restaurant_id, session_id);

-- Function to get restaurant_id from table_id
CREATE OR REPLACE FUNCTION get_restaurant_id_from_table(table_uuid UUID)
RETURNS UUID AS $$
DECLARE
  restaurant_uuid UUID;
BEGIN
  SELECT restaurant_id INTO restaurant_uuid
  FROM tables 
  WHERE id = table_uuid;
  
  RETURN restaurant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Function to get restaurant_id from session_id
CREATE OR REPLACE FUNCTION get_restaurant_id_from_session(session_uuid UUID)
RETURNS UUID AS $$
DECLARE
  restaurant_uuid UUID;
BEGIN
  SELECT t.restaurant_id INTO restaurant_uuid
  FROM sessions s
  JOIN tables t ON s.table_id = t.id
  WHERE s.id = session_uuid;
  
  RETURN restaurant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create triggers to auto-populate restaurant_id
CREATE OR REPLACE FUNCTION auto_populate_restaurant_id()
RETURNS TRIGGER AS $$
BEGIN
  -- For sessions table
  IF TG_TABLE_NAME = 'sessions' AND NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := get_restaurant_id_from_table(NEW.table_id);
  END IF;
  
  -- For orders table
  IF TG_TABLE_NAME = 'orders' AND NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := get_restaurant_id_from_session(NEW.session_id);
  END IF;
  
  -- For cart_items table
  IF TG_TABLE_NAME = 'cart_items' AND NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := get_restaurant_id_from_session(NEW.session_id);
  END IF;
  
  -- For split_bills table
  IF TG_TABLE_NAME = 'split_bills' AND NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := get_restaurant_id_from_session(NEW.session_id);
  END IF;
  
  -- For diners table
  IF TG_TABLE_NAME = 'diners' AND NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := get_restaurant_id_from_session(NEW.session_id);
  END IF;
  
  -- For notifications table
  IF TG_TABLE_NAME = 'notifications' AND NEW.restaurant_id IS NULL THEN
    NEW.restaurant_id := get_restaurant_id_from_session(NEW.session_id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all relevant tables
DROP TRIGGER IF EXISTS trigger_auto_populate_restaurant_id_sessions ON sessions;
CREATE TRIGGER trigger_auto_populate_restaurant_id_sessions
  BEFORE INSERT ON sessions
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_restaurant_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_restaurant_id_orders ON orders;
CREATE TRIGGER trigger_auto_populate_restaurant_id_orders
  BEFORE INSERT ON orders
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_restaurant_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_restaurant_id_cart_items ON cart_items;
CREATE TRIGGER trigger_auto_populate_restaurant_id_cart_items
  BEFORE INSERT ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_restaurant_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_restaurant_id_split_bills ON split_bills;
CREATE TRIGGER trigger_auto_populate_restaurant_id_split_bills
  BEFORE INSERT ON split_bills
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_restaurant_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_restaurant_id_diners ON diners;
CREATE TRIGGER trigger_auto_populate_restaurant_id_diners
  BEFORE INSERT ON diners
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_restaurant_id();

DROP TRIGGER IF EXISTS trigger_auto_populate_restaurant_id_notifications ON notifications;
CREATE TRIGGER trigger_auto_populate_restaurant_id_notifications
  BEFORE INSERT ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION auto_populate_restaurant_id();

-- Update existing records to populate restaurant_id (if any exist)
UPDATE sessions 
SET restaurant_id = get_restaurant_id_from_table(table_id)
WHERE restaurant_id IS NULL;

UPDATE orders 
SET restaurant_id = get_restaurant_id_from_session(session_id)
WHERE restaurant_id IS NULL;

UPDATE cart_items 
SET restaurant_id = get_restaurant_id_from_session(session_id)
WHERE restaurant_id IS NULL;

UPDATE split_bills 
SET restaurant_id = get_restaurant_id_from_session(session_id)
WHERE restaurant_id IS NULL;

UPDATE diners 
SET restaurant_id = get_restaurant_id_from_session(session_id)
WHERE restaurant_id IS NULL;

UPDATE notifications 
SET restaurant_id = get_restaurant_id_from_session(session_id)
WHERE restaurant_id IS NULL;

-- Add comments for documentation
COMMENT ON COLUMN sessions.restaurant_id IS 'Restaurant ID for multi-tenant data isolation';
COMMENT ON COLUMN orders.restaurant_id IS 'Restaurant ID for multi-tenant data isolation';
COMMENT ON COLUMN cart_items.restaurant_id IS 'Restaurant ID for multi-tenant data isolation';
COMMENT ON COLUMN split_bills.restaurant_id IS 'Restaurant ID for multi-tenant data isolation';
COMMENT ON COLUMN diners.restaurant_id IS 'Restaurant ID for multi-tenant data isolation';
COMMENT ON COLUMN notifications.restaurant_id IS 'Restaurant ID for multi-tenant data isolation';
