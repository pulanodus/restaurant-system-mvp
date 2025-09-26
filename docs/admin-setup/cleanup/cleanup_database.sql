-- Comprehensive Database Cleanup Script
-- This will clear all orders, sessions, and transaction data for fresh testing

-- 1. Clear all orders (this will remove all order history)
DELETE FROM orders;

-- 2. Clear all cart items (individual diner carts) - only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        DELETE FROM cart_items;
        RAISE NOTICE 'cart_items table cleared';
    ELSE
        RAISE NOTICE 'cart_items table does not exist - skipping';
    END IF;
END $$;

-- 3. Clear all sessions (this will reset all table sessions)
DELETE FROM sessions;

-- 4. Clear all notifications - only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        DELETE FROM notifications;
        RAISE NOTICE 'notifications table cleared';
    ELSE
        RAISE NOTICE 'notifications table does not exist - skipping';
    END IF;
END $$;

-- 5. Clear any split bills - only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'split_bills') THEN
        DELETE FROM split_bills;
        RAISE NOTICE 'split_bills table cleared';
    ELSE
        RAISE NOTICE 'split_bills table does not exist - skipping';
    END IF;
END $$;

-- 6. Clear any payment records (if you have a payments table)
-- DELETE FROM payments;

-- 7. Reset table status (make all tables available) - only if table exists
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tables') THEN
        UPDATE tables SET 
          occupied = FALSE,
          current_session_id = NULL,
          current_pin = NULL;
        RAISE NOTICE 'tables reset to available status';
    ELSE
        RAISE NOTICE 'tables table does not exist - skipping';
    END IF;
END $$;

-- 8. Reset any audit logs (optional - uncomment if you want to clear these too)
-- DELETE FROM audit_logs;

-- Show summary of what was cleaned
SELECT 'Cleanup completed!' as status;

-- Show counts for existing tables only
DO $$ 
BEGIN
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        RAISE NOTICE 'Remaining orders: %', (SELECT COUNT(*) FROM orders);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'cart_items') THEN
        RAISE NOTICE 'Remaining cart items: %', (SELECT COUNT(*) FROM cart_items);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'sessions') THEN
        RAISE NOTICE 'Remaining sessions: %', (SELECT COUNT(*) FROM sessions);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'notifications') THEN
        RAISE NOTICE 'Remaining notifications: %', (SELECT COUNT(*) FROM notifications);
    END IF;
    
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'tables') THEN
        RAISE NOTICE 'Available tables: %', (SELECT COUNT(*) FROM tables WHERE occupied = FALSE);
    END IF;
END $$;
