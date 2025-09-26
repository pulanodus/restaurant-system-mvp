-- Safe cleanup script - handles foreign key constraints properly
-- This avoids errors by clearing references before deleting records

-- 1. Clear all orders (this table should exist)
DELETE FROM orders;

-- 2. Reset table references to sessions (clear foreign key references)
UPDATE tables SET 
  occupied = FALSE,
  current_session_id = NULL,
  current_pin = NULL;

-- 3. Clear all sessions (now safe to delete)
DELETE FROM sessions;

-- Show what was cleaned
SELECT 'Safe cleanup completed!' as status;
SELECT COUNT(*) as remaining_orders FROM orders;
SELECT COUNT(*) as remaining_sessions FROM sessions;
SELECT COUNT(*) as available_tables FROM tables WHERE occupied = FALSE;
