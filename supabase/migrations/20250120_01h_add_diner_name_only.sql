-- Add diner_name column to orders table only
-- This migration adds just the diner_name column

-- First, let's check if the orders table exists and add diner_name
DO $$ 
BEGIN
    -- Check if orders table exists
    IF EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'orders') THEN
        -- Add diner_name column if it doesn't exist
        IF NOT EXISTS (SELECT FROM information_schema.columns WHERE table_name = 'orders' AND column_name = 'diner_name') THEN
            ALTER TABLE orders ADD COLUMN diner_name TEXT;
            RAISE NOTICE 'Added diner_name column to orders table';
        ELSE
            RAISE NOTICE 'diner_name column already exists in orders table';
        END IF;
        
        -- Create index for diner_name
        CREATE INDEX IF NOT EXISTS idx_orders_diner_name ON orders(diner_name);
        RAISE NOTICE 'Created index for diner_name column';
        
    ELSE
        RAISE NOTICE 'Orders table does not exist';
    END IF;
END $$;
