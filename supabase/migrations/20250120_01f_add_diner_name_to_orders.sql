-- Add diner_name column to orders table
-- This migration adds the missing diner_name column

-- Add diner_name column to orders table if it doesn't exist
ALTER TABLE orders 
ADD COLUMN IF NOT EXISTS diner_name TEXT;

-- Create index for diner_name in orders
CREATE INDEX IF NOT EXISTS idx_orders_diner_name ON orders(diner_name);

-- Add comment for documentation
COMMENT ON COLUMN orders.diner_name IS 'Name of the diner who placed this order';
