-- Create cart_items table for individual diner carts
-- This separates cart items from confirmed orders
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  diner_name TEXT NOT NULL, -- The name of the diner who added this item
  quantity INTEGER NOT NULL DEFAULT 1,
  notes TEXT,
  is_shared BOOLEAN DEFAULT FALSE,
  is_takeaway BOOLEAN DEFAULT FALSE,
  customizations JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_cart_items_session_id ON cart_items(session_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_diner_name ON cart_items(diner_name);
CREATE INDEX IF NOT EXISTS idx_cart_items_created_at ON cart_items(created_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cart_items_updated_at
  BEFORE UPDATE ON cart_items
  FOR EACH ROW
  EXECUTE FUNCTION update_cart_items_updated_at();

-- Enable RLS
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view cart items for their session" ON cart_items
  FOR SELECT USING (true); -- Allow all users to view cart items (they're not sensitive)

CREATE POLICY "Users can insert cart items" ON cart_items
  FOR INSERT WITH CHECK (true); -- Allow all users to add items to cart

CREATE POLICY "Users can update their own cart items" ON cart_items
  FOR UPDATE USING (true); -- Allow all users to update cart items

CREATE POLICY "Users can delete cart items" ON cart_items
  FOR DELETE USING (true); -- Allow all users to delete cart items
