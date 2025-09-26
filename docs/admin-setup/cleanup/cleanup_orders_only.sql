-- Quick cleanup script for orders and cart items only
-- Run this if you want to keep sessions but clear orders

-- Clear all orders
DELETE FROM orders;

-- Clear all cart items  
DELETE FROM cart_items;

-- Clear notifications
DELETE FROM notifications;

-- Clear split bills
DELETE FROM split_bills;

SELECT 'Orders and cart items cleared!' as status;
