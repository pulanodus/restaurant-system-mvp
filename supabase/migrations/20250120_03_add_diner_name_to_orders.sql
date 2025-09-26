-- Add diner_name column to orders table
-- This allows us to track which diner added each item
ALTER TABLE orders ADD COLUMN IF NOT EXISTS diner_name TEXT;

-- Update existing orders to have a default diner name
UPDATE orders SET diner_name = 'Unknown' WHERE diner_name IS NULL;

-- Make diner_name NOT NULL
ALTER TABLE orders ALTER COLUMN diner_name SET NOT NULL;

-- Add index for better performance
CREATE INDEX IF NOT EXISTS idx_orders_diner_name ON orders(diner_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
