-- Comprehensive fix for orders status constraint
-- This handles existing data that violates the constraint

-- Step 1: First, let's see what status values currently exist
SELECT status, COUNT(*) as count 
FROM orders 
GROUP BY status 
ORDER BY count DESC;

-- Step 2: Update any invalid status values to valid ones
-- Update 'waiting' to 'preparing' (if any exist)
UPDATE orders 
SET status = 'preparing' 
WHERE status = 'waiting';

-- Update 'placed' to 'cart' (if any exist)
UPDATE orders 
SET status = 'cart' 
WHERE status = 'placed';

-- Update any other invalid statuses to 'cart' as a safe default
UPDATE orders 
SET status = 'cart' 
WHERE status NOT IN ('cart', 'preparing', 'ready', 'served', 'paid', 'cancelled');

-- Step 3: Verify all statuses are now valid
SELECT status, COUNT(*) as count 
FROM orders 
GROUP BY status 
ORDER BY count DESC;

-- Step 4: Drop the existing constraint
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;

-- Step 5: Add the updated constraint that includes all needed statuses
ALTER TABLE orders ADD CONSTRAINT orders_status_check 
CHECK (status IN ('cart', 'placed', 'waiting', 'preparing', 'ready', 'served', 'paid', 'cancelled'));

-- Step 6: Verify the constraint was created successfully
SELECT conname, consrc 
FROM pg_constraint 
WHERE conname = 'orders_status_check';

-- Step 7: Test that we can now insert/update with all valid statuses
-- (This is just for verification - you can comment this out)
-- INSERT INTO orders (session_id, menu_item_id, quantity, status, diner_name) 
-- VALUES ('test-session', 'test-item', 1, 'waiting', 'Test User');
-- DELETE FROM orders WHERE session_id = 'test-session';
