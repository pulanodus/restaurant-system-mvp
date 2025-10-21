-- Multi-tenant architecture migration
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

-- Add data lifecycle columns for archiving
ALTER TABLE sessions 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

ALTER TABLE cart_items 
ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS archive_reason TEXT;

-- Create archive tables for old data
CREATE TABLE IF NOT EXISTS archived_sessions (
  LIKE sessions INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT
);

CREATE TABLE IF NOT EXISTS archived_orders (
  LIKE orders INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT
);

CREATE TABLE IF NOT EXISTS archived_cart_items (
  LIKE cart_items INCLUDING ALL,
  archived_at TIMESTAMPTZ DEFAULT NOW(),
  archive_reason TEXT
);

-- Create storage monitoring table
CREATE TABLE IF NOT EXISTS restaurant_storage_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  restaurant_id UUID REFERENCES restaurants(id) NOT NULL,
  table_name TEXT NOT NULL,
  record_count BIGINT NOT NULL DEFAULT 0,
  estimated_size_mb DECIMAL(10,2) NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create index for storage monitoring
CREATE INDEX IF NOT EXISTS idx_restaurant_storage_usage_restaurant_id ON restaurant_storage_usage(restaurant_id);

-- Create function to calculate storage usage per restaurant
CREATE OR REPLACE FUNCTION calculate_restaurant_storage_usage(restaurant_uuid UUID)
RETURNS TABLE (
  table_name TEXT,
  record_count BIGINT,
  estimated_size_mb DECIMAL(10,2)
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    'sessions'::TEXT as table_name,
    COUNT(*)::BIGINT as record_count,
    (COUNT(*) * 0.5)::DECIMAL(10,2) as estimated_size_mb
  FROM sessions 
  WHERE restaurant_id = restaurant_uuid AND archived_at IS NULL
  
  UNION ALL
  
  SELECT 
    'orders'::TEXT as table_name,
    COUNT(*)::BIGINT as record_count,
    (COUNT(*) * 1.0)::DECIMAL(10,2) as estimated_size_mb
  FROM orders 
  WHERE restaurant_id = restaurant_uuid AND archived_at IS NULL
  
  UNION ALL
  
  SELECT 
    'cart_items'::TEXT as table_name,
    COUNT(*)::BIGINT as record_count,
    (COUNT(*) * 0.3)::DECIMAL(10,2) as estimated_size_mb
  FROM cart_items 
  WHERE restaurant_id = restaurant_uuid AND archived_at IS NULL
  
  UNION ALL
  
  SELECT 
    'split_bills'::TEXT as table_name,
    COUNT(*)::BIGINT as record_count,
    (COUNT(*) * 0.4)::DECIMAL(10,2) as estimated_size_mb
  FROM split_bills 
  WHERE restaurant_id = restaurant_uuid AND archived_at IS NULL
  
  UNION ALL
  
  SELECT 
    'diners'::TEXT as table_name,
    COUNT(*)::BIGINT as record_count,
    (COUNT(*) * 0.2)::DECIMAL(10,2) as estimated_size_mb
  FROM diners 
  WHERE restaurant_id = restaurant_uuid
  
  UNION ALL
  
  SELECT 
    'notifications'::TEXT as table_name,
    COUNT(*)::BIGINT as record_count,
    (COUNT(*) * 0.1)::DECIMAL(10,2) as estimated_size_mb
  FROM notifications 
  WHERE restaurant_id = restaurant_uuid;
END;
$$ LANGUAGE plpgsql;

-- Create function to archive old data
CREATE OR REPLACE FUNCTION archive_old_data(
  restaurant_uuid UUID,
  days_old INTEGER DEFAULT 365,
  archive_reason_text TEXT DEFAULT 'Automated archiving'
)
RETURNS INTEGER AS $$
DECLARE
  archived_count INTEGER := 0;
  cutoff_date TIMESTAMPTZ;
BEGIN
  cutoff_date := NOW() - (days_old || ' days')::INTERVAL;
  
  -- Archive old sessions
  WITH archived AS (
    INSERT INTO archived_sessions 
    SELECT *, NOW(), archive_reason_text
    FROM sessions 
    WHERE restaurant_id = restaurant_uuid 
      AND created_at < cutoff_date 
      AND archived_at IS NULL
    RETURNING id
  )
  UPDATE sessions 
  SET archived_at = NOW(), archive_reason = archive_reason_text
  WHERE id IN (SELECT id FROM archived);
  
  GET DIAGNOSTICS archived_count = ROW_COUNT;
  
  -- Archive old orders
  WITH archived AS (
    INSERT INTO archived_orders 
    SELECT *, NOW(), archive_reason_text
    FROM orders 
    WHERE restaurant_id = restaurant_uuid 
      AND created_at < cutoff_date 
      AND archived_at IS NULL
    RETURNING id
  )
  UPDATE orders 
  SET archived_at = NOW(), archive_reason = archive_reason_text
  WHERE id IN (SELECT id FROM archived);
  
  -- Archive old cart_items
  WITH archived AS (
    INSERT INTO archived_cart_items 
    SELECT *, NOW(), archive_reason_text
    FROM cart_items 
    WHERE restaurant_id = restaurant_uuid 
      AND created_at < cutoff_date 
      AND archived_at IS NULL
    RETURNING id
  )
  UPDATE cart_items 
  SET archived_at = NOW(), archive_reason = archive_reason_text
  WHERE id IN (SELECT id FROM archived);
  
  RETURN archived_count;
END;
$$ LANGUAGE plpgsql;

-- Create function to update storage usage
CREATE OR REPLACE FUNCTION update_restaurant_storage_usage(restaurant_uuid UUID)
RETURNS VOID AS $$
BEGIN
  -- Clear existing usage data for this restaurant
  DELETE FROM restaurant_storage_usage WHERE restaurant_id = restaurant_uuid;
  
  -- Insert updated usage data
  INSERT INTO restaurant_storage_usage (restaurant_id, table_name, record_count, estimated_size_mb)
  SELECT restaurant_uuid, table_name, record_count, estimated_size_mb
  FROM calculate_restaurant_storage_usage(restaurant_uuid);
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically populate restaurant_id for new records
-- This ensures data consistency when restaurant_id is not explicitly provided

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

COMMENT ON TABLE restaurant_storage_usage IS 'Tracks storage usage per restaurant for billing and monitoring';
COMMENT ON FUNCTION calculate_restaurant_storage_usage IS 'Calculates storage usage for a specific restaurant';
COMMENT ON FUNCTION archive_old_data IS 'Archives old data for a restaurant to manage storage costs';
COMMENT ON FUNCTION update_restaurant_storage_usage IS 'Updates storage usage metrics for a restaurant';