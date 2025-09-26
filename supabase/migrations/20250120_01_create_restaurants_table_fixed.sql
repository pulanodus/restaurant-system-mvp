-- Create restaurants table for multi-tenant architecture (FIXED VERSION)
-- This migration handles existing restaurants table and adds missing columns

-- Create restaurants table if it doesn't exist
CREATE TABLE IF NOT EXISTS restaurants (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  tier TEXT NOT NULL DEFAULT 'basic' CHECK (tier IN ('basic', 'professional', 'enterprise')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add missing columns if they don't exist
ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS tier TEXT DEFAULT 'basic';

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

ALTER TABLE restaurants 
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- Add constraint for tier if it doesn't exist
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.check_constraints 
        WHERE constraint_name = 'restaurants_tier_check'
    ) THEN
        ALTER TABLE restaurants 
        ADD CONSTRAINT restaurants_tier_check 
        CHECK (tier IN ('basic', 'professional', 'enterprise'));
    END IF;
END $$;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_restaurants_tier ON restaurants(tier);
CREATE INDEX IF NOT EXISTS idx_restaurants_is_active ON restaurants(is_active);
CREATE INDEX IF NOT EXISTS idx_restaurants_created_at ON restaurants(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_restaurants_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop trigger if exists and recreate
DROP TRIGGER IF EXISTS trigger_update_restaurants_updated_at ON restaurants;
CREATE TRIGGER trigger_update_restaurants_updated_at
  BEFORE UPDATE ON restaurants
  FOR EACH ROW
  EXECUTE FUNCTION update_restaurants_updated_at();

-- Enable RLS
ALTER TABLE restaurants ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist and recreate
DROP POLICY IF EXISTS "Users can view restaurants" ON restaurants;
DROP POLICY IF EXISTS "Admins can manage restaurants" ON restaurants;

-- Create RLS policies
CREATE POLICY "Users can view restaurants" ON restaurants
  FOR SELECT USING (true); -- Allow all users to view restaurants

CREATE POLICY "Admins can manage restaurants" ON restaurants
  FOR ALL USING (true); -- Allow all operations for now (you can restrict this later)

-- Insert a default restaurant for existing data
INSERT INTO restaurants (id, name, tier, is_active) 
VALUES (
  '00000000-0000-0000-0000-000000000001',
  'Default Restaurant',
  'basic',
  true
) ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  tier = EXCLUDED.tier,
  is_active = EXCLUDED.is_active;

-- Add restaurant_id to existing tables that don't have it yet
-- This ensures backward compatibility

-- Add restaurant_id to tables table if it doesn't exist
ALTER TABLE tables 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Add restaurant_id to menu_items table if it doesn't exist
ALTER TABLE menu_items 
ADD COLUMN IF NOT EXISTS restaurant_id UUID REFERENCES restaurants(id);

-- Set default restaurant_id for existing records
UPDATE tables 
SET restaurant_id = '00000000-0000-0000-0000-000000000001'
WHERE restaurant_id IS NULL;

UPDATE menu_items 
SET restaurant_id = '00000000-0000-0000-0000-000000000001'
WHERE restaurant_id IS NULL;

-- Create indexes for the new columns
CREATE INDEX IF NOT EXISTS idx_tables_restaurant_id ON tables(restaurant_id);
CREATE INDEX IF NOT EXISTS idx_menu_items_restaurant_id ON menu_items(restaurant_id);

-- Add comments for documentation
COMMENT ON TABLE restaurants IS 'Restaurants table for multi-tenant architecture';
COMMENT ON COLUMN restaurants.tier IS 'Restaurant tier: basic, professional, or enterprise';
COMMENT ON COLUMN restaurants.is_active IS 'Whether the restaurant is active and can receive orders';
