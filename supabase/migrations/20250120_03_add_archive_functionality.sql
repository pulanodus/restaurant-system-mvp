-- Archive functionality migration
-- This migration adds data lifecycle and storage monitoring capabilities

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

-- Add comments for documentation
COMMENT ON TABLE restaurant_storage_usage IS 'Tracks storage usage per restaurant for billing and monitoring';
COMMENT ON FUNCTION calculate_restaurant_storage_usage IS 'Calculates storage usage for a specific restaurant';
COMMENT ON FUNCTION archive_old_data IS 'Archives old data for a restaurant to manage storage costs';
COMMENT ON FUNCTION update_restaurant_storage_usage IS 'Updates storage usage metrics for a restaurant';

COMMENT ON COLUMN sessions.archived_at IS 'Timestamp when session was archived';
COMMENT ON COLUMN sessions.archive_reason IS 'Reason for archiving the session';
COMMENT ON COLUMN orders.archived_at IS 'Timestamp when order was archived';
COMMENT ON COLUMN orders.archive_reason IS 'Reason for archiving the order';
COMMENT ON COLUMN cart_items.archived_at IS 'Timestamp when cart item was archived';
COMMENT ON COLUMN cart_items.archive_reason IS 'Reason for archiving the cart item';
