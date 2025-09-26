-- Manual Database Migration for PulaNodus
-- Run this SQL in your Supabase SQL Editor

-- Step 1: Add diner_name column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS diner_name TEXT;

-- Step 2: Update existing orders to have a default diner name
UPDATE orders SET diner_name = 'Unknown' WHERE diner_name IS NULL;

-- Step 3: Make diner_name NOT NULL
ALTER TABLE orders ALTER COLUMN diner_name SET NOT NULL;

-- Step 4: Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_orders_diner_name ON orders(diner_name);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);

-- Step 5: Update the check constraint to include 'cart' status
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('cart', 'preparing', 'ready', 'served', 'paid', 'cancelled'));

-- Verify the migration
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'orders' AND column_name = 'diner_name';
